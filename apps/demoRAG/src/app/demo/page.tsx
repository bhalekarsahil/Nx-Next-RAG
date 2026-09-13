"use client"
import { useState, useEffect } from "react"
import type React from "react"

import Head from "next/head"
import { createClient } from "@supabase/supabase-js"
import { toast } from "react-hot-toast"
// import { storeProductEmbedding, searchSimilarProducts } from "../api/vector-store/route"
// import type { SimilarProductResult, ProductMetadata } from "../api/analyze/route"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Modal Component
interface ProductModalProps {
  product: SimilarProductResult | null
  isOpen: boolean
  onClose: () => void
}

// Similar Product Component
interface SimilarProductResult {
  content: string;
  metadata: {
    name: string;
    hsn_code: string;
    country: string;
    description?: string;
    prices?: Record<string, number>;
    years?: string[];
    currencies?: Record<string, string>;
    type?: string;
    created_at?: string;
    updated_at?: string;
  };
  similarity: number;
  hsn_code: string;
  country: string;
}

//Product Component
export interface ProductMetadata {
  name: string;
  hsn_code: string;
  country: string;
  description?: string;
  prices?: Record<string, number>;
  years?: string[];
  currencies?: Record<string, string>;
  type?: string;
  created_at?: string;
  updated_at?: string;
}


function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  if (!isOpen || !product) return null

  const { metadata } = product
  const priceEntries = metadata.prices ? Object.entries(metadata.prices) : []
  const currencyEntries = metadata.currencies ? Object.entries(metadata.currencies) : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{metadata.name}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-600">HSN: {metadata.hsn_code}</span>
                <span className="text-sm text-gray-600">Country: {metadata.country}</span>
                <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {product.similarity.toFixed(1)}% match
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Description */}
          {metadata.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{metadata.description}</p>
            </div>
          )}

          {/* Historical Pricing Data */}
          {priceEntries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Historical Pricing Data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {priceEntries
                      .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                      .map(([year, price]) => {
                        const currency = currencyEntries.find(([currYear]) => currYear === year)?.[1] as string || "USD";
                        return (
                          <tr key={year} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{year}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {typeof price === "number" ? price.toFixed(2) : price}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{currency}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metadata.type && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Type</h4>
                <p className="text-sm text-blue-700">{metadata.type}</p>
              </div>
            )}

            {metadata.years && metadata.years.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-1">Data Coverage</h4>
                <p className="text-sm text-green-700">{metadata.years.length} years of data</p>
              </div>
            )}

            {metadata.created_at && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-purple-900 mb-1">Added</h4>
                <p className="text-sm text-purple-700">{new Date(metadata.created_at).toLocaleDateString()}</p>
              </div>
            )}

            {metadata.updated_at && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-orange-900 mb-1">Last Updated</h4>
                <p className="text-sm text-orange-700">{new Date(metadata.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Raw Content */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Raw Data</h3>
            <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {product.content}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DemoPage() {
  const [product, setProduct] = useState("")
  const [hsnCode, setHsnCode] = useState("")
  const [country, setCountry] = useState("")
  const [result, setResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [similarProducts, setSimilarProducts] = useState<SimilarProductResult[]>([])
  const [showSimilarProducts, setShowSimilarProducts] = useState(false)

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<SimilarProductResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Function to open modal with selected product
  const openProductModal = (product: SimilarProductResult) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  // Function to close modal
  const closeProductModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob {
        animation: blob 7s infinite;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Fetch historical data from Supabase
  const fetchHistoricalData = async (hsn: string, country: string) => {
    try {
      type MarketPriceRow = Record<string, any>
      const { data, error } = await supabase
        .from("market_prices")
        .select(`hsn_code, ${country}`)
        .eq("hsn_code", hsn)
        .single<MarketPriceRow>()

      if (error) throw error
      if (!data || !data[country]) return []

      const countryData = data[country]
      const historicalPrices = Object.entries(countryData).map(([year, price]) => ({
        year: year.split(" ")[0],
        price: Number.parseFloat(price as string),
        currency: "USD",
      }))

      return historicalPrices
        .sort((a, b) => Number.parseInt(b.year.split("-")[0]) - Number.parseInt(a.year.split("-")[0]))
        .slice(0, 5)
    } catch (error) {
      toast.error("Failed to fetch historical data")
      return []
    }
  }

  // Analyze data with Groq API
  const analyzeWithGroq = async (product: string, country: string, historicalData: any[]) => {
    if (historicalData.length === 0) {
      return {
        analysis: `No historical data found for HSN ${hsnCode} in ${country}.`,
        currentPrice: null,
        confidence: "low",
      }
    }

    // Prepare the prompt for Groq
    const prompt = `
      You are an expert market analyst specializing in international trade pricing.
      Analyze the historical price data below and estimate the current average selling price
      for ${product} (HSN: ${hsnCode}) in ${country}.

      Historical Price Data:
      ${historicalData.map((d) => `${d.year}: ${d.currency}${d.price.toFixed(2)}`).join("\n")}

      Consider:
      1. Price trends over time
      2. Seasonal variations if applicable
      3. Market conditions in ${country}
      4. Any economic indicators that might affect pricing

      Note: Just consider these considerations dont add it in response..

      Provide:
      1. A concise analysis of the price trends
      2. Your estimated current price with reasoning
      3. Confidence level in your estimate (low/medium/high)
      4. Any relevant market insights

      Note: dont give unneccessary data just keep it short and sweet!! Also if possible keep estimated current price in bold.

      Format your response with clear sections.
    `

    try {
      // Call Groq API (replace with your actual API call)
      const response = await fetch("/api/groq-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) throw new Error("API request failed")
      const data = await response.json()

      // Extract the current price from the response if available
      const priceMatch = data.result.match(/Current Price Estimate: (\$?\d+\.?\d*)/i)
      const currentPrice = priceMatch ? Number.parseFloat(priceMatch[1].replace(/[^\d.]/g, "")) : null

      return {
        analysis: data.result,
        currentPrice,
        confidence: data.result.includes("high confidence")
          ? "high"
          : data.result.includes("medium confidence")
            ? "medium"
            : "low",
      }
    } catch (error) {
      return localAnalysisFallback(product, country, historicalData)
    }
  }

  const localAnalysisFallback = (product: string, country: string, historicalData: any[]) => {
    const prices = historicalData.map((d) => d.price)
    const latestPrice = prices[0]
    const oldestPrice = prices[prices.length - 1]

    let trend = "stable"
    let changePercent = 0

    if (prices.length > 1) {
      trend = latestPrice > oldestPrice ? "increasing" : "decreasing"
      changePercent = Math.abs(((latestPrice - oldestPrice) / oldestPrice) * 100)
    }

    const historySummary = historicalData.map((d) => `${d.year}: ${d.currency}${d.price.toFixed(2)}`).join("\n")

    return {
      analysis:
        `Based on historical data for ${product} (HSN: ${hsnCode}) in ${country}:\n\n` +
        `Historical Prices:\n${historySummary}\n\n` +
        `Trend Analysis: Prices have been ${trend} by approximately ${changePercent.toFixed(1)}% ` +
        `over the last ${historicalData.length} years.`,
      currentPrice: latestPrice,
      confidence: historicalData.length >= 3 ? "medium" : "low",
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !country) {
      toast.error("Please enter both product and country")
      return
    }
    if (!hsnCode) {
      toast.error("Please enter HSN code")
      return
    }

    setIsLoading(true)
    setResult("")
    setHistoricalData([])
    setShowSimilarProducts(false)

    try {
      // Step 1: Fetch historical data first
      const data = await fetchHistoricalData(hsnCode, country.toUpperCase())
      setHistoricalData(data)

      const prices: Record<string, number> = {}
      const currencies: Record<string, string> = {}
      const years: string[] = []

      for (const row of data) {
        prices[row.year] = row.price
        currencies[row.year] = row.currency
        years.push(row.year)
      }

      // Store embedding
      const storeRes = await fetch("/api/vector-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store",
          payload: {
            hsn_code: hsnCode,
            name: product,
            country: country.toUpperCase(),
            description: `Historical prices for ${product} in ${country}`,
            prices,
            years,
            currencies,
          },
        }),
      })

      if (!storeRes.ok) {
        const err = await storeRes.text()
        console.error("Store failed:", err)
        throw new Error("Vector store failed")
      }


      // Search similar
      const res = await fetch("/api/vector-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query: `${product} ${hsnCode} ${country}`,
          k: 10,
        }),
      })

      const similarProductsResults: SimilarProductResult[] = await res.json();

      const filteredSimilarProducts = similarProductsResults.filter(
        (item: SimilarProductResult) => {
          const isSameHsn = item.metadata?.hsn_code === hsnCode;
          const isSameCountry =
            item.metadata?.country?.toUpperCase() === country.toUpperCase();

          return !(isSameHsn && isSameCountry);
        }
      );

      setSimilarProducts(
        filteredSimilarProducts
          .slice(0, 8) // Take top 8 after filtering
          .map((item) => ({
            ...item,
            metadata: item.metadata as ProductMetadata,
          })),
      )

      // Step 2: Analyze with Groq
      const { analysis, currentPrice, confidence } = await analyzeWithGroq(product, country, data);

      // Step 3: Display results
      let resultText = analysis + "\n\n";

      if (currentPrice) {
        const currency = data[0]?.currency || "USD"
        const formattedPrice = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency,
        }).format(currentPrice);

        resultText += `Current Estimated Price (${confidence} confidence): ${formattedPrice}`;
      }

      setResult(resultText);
      setShowSimilarProducts(true);
    } catch (error) {
      toast.error("Failed to analyze price data");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Global Price Analyzer with Groq</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-20 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden p-8 transition-all duration-300 hover:shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Price Analyzer
            </h1>
            <p className="text-gray-600">Get current price estimates using historical market data and AI analysis</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="product" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                type="text"
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Bricks, Steel Pipes..."
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Destination Country (UPPERCASE)
              </label>
              <input
                type="text"
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. AUSTRALIA, U_S_A, JAPAN..."
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="hsn" className="block text-sm font-medium text-gray-700">
                HSN Code
              </label>
              <input
                type="text"
                id="hsn"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. 690100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                isLoading
                  ? "bg-blue-400"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.01] shadow-md`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                "Analyze Price"
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-300 animate-fadeIn">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Price Analysis</h2>
              <div className="whitespace-pre-wrap text-gray-700">{result}</div>
            </div>
          )}

          {historicalData.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-800 mb-2">Historical Data Used:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historicalData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.year}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.currency} {row.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showSimilarProducts && similarProducts.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Similar Products ({similarProducts.length} found)
              </h3>
              <div className="space-y-3">
                {similarProducts.map((product, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {product.metadata.name}
                        </h4>
                        <div className="text-sm text-gray-600 mt-1">
                          HSN: {product.metadata.hsn_code} | {product.metadata.country}
                        </div>
                        {product.metadata.prices && Object.keys(product.metadata.prices).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Price data available for: {Object.keys(product.metadata.prices).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0 flex items-center gap-2">
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {product.similarity.toFixed(1)}% match
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {product.content.split("\n").slice(0, 2).join(" | ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSimilarProducts && similarProducts.length === 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Similar Products Found</h3>
              <p className="text-yellow-700 text-sm">
                No similar products were found in the database, or all similar products were filtered out because they
                matched the current product exactly.
              </p>
            </div>
          )}

          <div className="mt-8 text-xs text-gray-500 text-center">
            <p>This application uses AI to analyze historical market data and predict current prices.</p>
            <p className="mt-1">Enter country names in UPPERCASE exactly as they appear in your database columns.</p>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={closeProductModal} />
    </>
  )
}
