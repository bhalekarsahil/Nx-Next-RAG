export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const huggingFaceKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: huggingFaceKey,
  model: 'sentence-transformers/all-MiniLM-L6-v2', // 384 dimensions
});

export async function storeProductEmbedding(productData: {
  hsn_code: string;
  name: string;
  description: string;
  country: string;
  prices?: Record<string, number>;
  years?: string[];
  currencies?: Record<string, string>;
  type?: string;
}) {
  try {
    const text = `Product: ${productData.name}\nHSN: ${productData.hsn_code}\nCountry: ${productData.country}\nDescription: ${productData.description}`;

    // Check for existing product with same HSN code and country
    const { data: existingProducts, error: searchError } = await supabase
      .from('documents')
      .select('*')
      .eq('hsn_code', productData.hsn_code)
      .eq('country', productData.country.toUpperCase());

    if (searchError) {
      throw searchError;
    }

    // Check if new record has prices
    const newRecordHasPrices = productData.prices && Object.keys(productData.prices).length > 0;

    if (existingProducts && existingProducts.length > 0) {
      const existingProduct = existingProducts[0];

      if (!newRecordHasPrices) {
        return {
          action: 'skipped',
          reason: 'New record has no prices, existing record preserved',
          id: existingProduct.id
        };
      }

      const embedding = await embeddings.embedQuery(text);

      const updatedMetadata = {
        name: productData.name,
        hsn_code: productData.hsn_code,
        country: productData.country.toUpperCase(),
        description: productData.description,
        type: productData.type || 'product_with_history',
        prices: productData.prices || {},
        years: productData.years || [],
        currencies: productData.currencies || {},
        created_at: existingProduct.metadata?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          content: text,
          embedding: `[${embedding.join(',')}]`,
          metadata: updatedMetadata,
          hsn_code: productData.hsn_code,
          country: productData.country.toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProduct.id);

      if (updateError) {
        throw updateError;
      }
      return { action: 'updated', id: existingProduct.id };

    } else {
      if (!newRecordHasPrices) {
        return {
          action: 'skipped',
          reason: 'New record has no prices, not inserting',
          id: null
        };
      }

      const embedding = await embeddings.embedQuery(text);

      const metadata = {
        name: productData.name,
        hsn_code: productData.hsn_code,
        country: productData.country.toUpperCase(),
        description: productData.description,
        type: productData.type || 'product_with_history',
        prices: productData.prices || {},
        years: productData.years || [],
        currencies: productData.currencies || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert({
          content: text,
          embedding: `[${embedding.join(',')}]`,
          metadata: metadata,
          hsn_code: productData.hsn_code,
          country: productData.country.toUpperCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      return { action: 'inserted', id: insertData.id };
    }

  } catch (error) {
    throw new Error('Error in storeProductEmbedding : ', { cause: error });
  }
}

export async function searchSimilarProducts(
  query: string,
  k = 8,
  filterByCountry?: string,
  filterByHsn?: string
): Promise<{
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  hsn_code: string;
  country: string;
}[]> {
  try {

    // Build the query with filters - only get records with prices
    let supabaseQuery = supabase
      .from('documents')
      .select('*')
      .not('metadata->prices', 'is', null)
      .neq('metadata->prices', '{}')
      .limit(k * 2);

    if (filterByCountry) {
      supabaseQuery = supabaseQuery.eq('country', filterByCountry.toUpperCase());
    }

    if (filterByHsn) {
      supabaseQuery = supabaseQuery.eq('hsn_code', filterByHsn);
    }

    const { data: documents, error } = await supabaseQuery;

    if (error) {
      throw error;
    }

    if (!documents || documents.length === 0) {
      return [];
    }

    const validDocuments = documents.filter(doc => {
      const prices = doc.metadata?.prices;
      return prices && typeof prices === 'object' && Object.keys(prices).length > 0;
    });

    if (validDocuments.length === 0) {
      return [];
    }

    const queryEmbedding = await embeddings.embedQuery(query);

    // Calculate similarities manually
    const results = validDocuments
      .map(doc => {
        if (!doc.embedding) return null;

        let docEmbedding: number[];
        try {
          docEmbedding = typeof doc.embedding === 'string'
            ? JSON.parse(doc.embedding)
            : doc.embedding;
        } catch (e) {
          throw new Error('Failed to parse embedding for document : ', { cause: e });
        }

        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);

        return {
          content: doc.content,
          metadata: doc.metadata,
          similarity: similarity * 100, // Convert to percentage
          hsn_code: doc.hsn_code,
          country: doc.country,
          id: doc.id
        };
      })
      .filter(result => result !== null)
      .sort((a, b) => b!.similarity - a!.similarity)
      .slice(0, k);
    return results as any[];

  } catch (error) {
    throw new Error('Error in searchSimilarProducts : ', { cause: error });
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Utility function to clean up records without prices
export async function cleanupRecordsWithoutPrices() {
  try {
    const { data: deletedRecords, error } = await supabase
      .from('documents')
      .delete()
      .or('metadata->prices.is.null,metadata->prices.eq.{}')
      .select();

    if (error) {
      throw error;
    }
    return deletedRecords?.length || 0;

  } catch (error) {
    throw new Error('Error in cleanupRecordsWithoutPrices : ', { cause: error });
  }
}

// Utility function to get products with price history
export async function getProductsWithPriceHistory(hsnCode?: string, country?: string) {
  try {
    let query = supabase
      .from('documents')
      .select('*')
      .not('metadata->prices', 'is', null)
      .neq('metadata->prices', '{}')
      .eq('metadata->>type', 'product_with_history');

    if (hsnCode) {
      query = query.eq('hsn_code', hsnCode);
    }

    if (country) {
      query = query.eq('country', country.toUpperCase());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error('Error getting products with price history : ', { cause: error });
  }
}

// Utility function to validate metadata structure
export function validateMetadata(metadata: any): boolean {
  if (!metadata || typeof metadata !== 'object') return false;

  // Check required fields
  const requiredFields = ['name', 'hsn_code', 'country', 'type'];
  for (const field of requiredFields) {
    if (!metadata[field]) return false;
  }

  // Check if prices exist and is not empty
  if (!metadata.prices || typeof metadata.prices !== 'object' || Object.keys(metadata.prices).length === 0) {
    return false;
  }

  return true;
}

export { supabase };



export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { action, payload, query, k, filterByCountry, filterByHsn } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // STORE
    if (action === 'store') {
      if (!payload) {
        return NextResponse.json(
          { error: 'Payload is required for store action' },
          { status: 400 }
        );
      }

      const result = await storeProductEmbedding(payload);
      return NextResponse.json(result);
    }

    // SEARCH
    if (action === 'search') {
      if (!query) {
        return NextResponse.json(
          { error: 'Query is required for search action' },
          { status: 400 }
        );
      }

      const results = await searchSimilarProducts(
        query,
        k ?? 8,
        filterByCountry,
        filterByHsn
      );

      return NextResponse.json(results);
    }

    // CLEANUP
    if (action === 'cleanup') {
      const deletedCount = await cleanupRecordsWithoutPrices();
      return NextResponse.json({ deletedCount });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('API /vector-store error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
