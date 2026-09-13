import { NextResponse } from 'next/server';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { createClient } from '@supabase/supabase-js';
import { ReactNode } from 'react';

// Define types for our data
export interface ProductMetadata {
  type: ReactNode;
  updated_at: string | number | Date;
  years: any;
  currencies: any;
  description: any;
  hsn_code: string;
  name: string;
  country: string;
  prices: Record<string, number>;
  created_at?: string;
}

export interface SimilarProductResult {
  content: string;
  metadata: ProductMetadata;
  similarity: number;
}

interface HistoricalPriceData {
  year: string;
  price: number;
  currency: string;
}

// Initialize clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: 'sentence-transformers/all-MiniLM-L6-v2'
});

// Initialize vector store
const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabase,
  tableName: 'documents',
  queryName: 'match_documents',
});

async function fetchHistoricalData(hsn: string, country: string): Promise<HistoricalPriceData[]> {
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select(`hsn_code, ${country}`)
      .eq('hsn_code', hsn)
      .single();

    if (error) throw error;
    if (!data || !(data as Record<string, any>)[country]) return [];

    const countryData = (data as Record<string, any>)[country] as Record<string, unknown>;
    return Object.entries(countryData)
      .map(([year, price]) => ({
        year: year.split(' ')[0],
        price: typeof price === 'number' ? price : parseFloat(String(price)),
        currency: 'USD'
      }))
      .sort((a, b) => parseInt(b.year.split('-')[0]) - parseInt(a.year.split('-')[0]))
      .slice(0, 5);

  } catch (error: unknown) {
    throw new Error('Failed to search similar products', {cause : error});
  }
}

async function searchSimilarProducts(query: string, k = 5): Promise<SimilarProductResult[]> {
  try {
    const queryEmbedding = await embeddings.embedQuery(query);
    const results = await vectorStore.similaritySearchVectorWithScore(queryEmbedding, k);
    
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata as ProductMetadata,
      similarity: 1 - score
    }));
  } catch (error: unknown) {
    throw new Error('Failed to search similar products', {cause : error});
  }
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json() as { query: string };

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query parameter' },
        { status: 400 }
      );
    }

    const similarProducts = await searchSimilarProducts(query);

    if (!similarProducts.length) {
      return NextResponse.json(
        { error: 'No similar products found' },
        { status: 404 }
      );
    }

    const mostSimilar = similarProducts[0];
    const historicalData = await fetchHistoricalData(
      mostSimilar.metadata.hsn_code, 
      mostSimilar.metadata.country
    );

    if (!historicalData.length) {
      return NextResponse.json(
        { error: 'No historical data found' },
        { status: 404 }
      );
    }

    const analysisText = `
      Price Analysis Report
      =================================

      **Search Query**: "${query}"
      **Primary Product**: ${mostSimilar.metadata.name}
      **HSN Code**: ${mostSimilar.metadata.hsn_code}
      **Country**: ${mostSimilar.metadata.country}
      **Match Confidence**: ${(mostSimilar.similarity * 100).toFixed(1)}%

      **Price History**:
      ${historicalData.map(entry => 
        `- ${entry.year}: ${entry.price.toFixed(2)} ${entry.currency}`
      ).join('\n')}

      **Current Price Estimate**: USD ${historicalData[0].price.toFixed(2)}
    `;

    return NextResponse.json({
      analysis: analysisText,
      data: {
        query,
        primaryProduct: mostSimilar.metadata,
        similarity: mostSimilar.similarity,
        priceHistory: historicalData,
        similarProducts: similarProducts.map(p => ({
          name: p.metadata.name,
          hsnCode: p.metadata.hsn_code,
          country: p.metadata.country,
          similarity: p.similarity
        }))
      }
    });

  } catch (error: unknown) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}