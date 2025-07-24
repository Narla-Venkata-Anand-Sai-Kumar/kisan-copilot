/**
 * @fileOverview A service to simulate fetching market data.
 * In a real application, this would fetch data from a live API or scrape a website.
 */

/**
 * Simulates fetching market data for a given crop and location.
 * @param crop The name of the crop.
 * @param location The market location.
 * @returns A promise that resolves to an object containing the price and unit.
 */
export async function getMarketData(
  crop: string,
  location: string
): Promise<{ price: number; unit: string }> {
  console.log(`Fetching market data for ${crop} in ${location}...`);

  // Simulate fetching data with a delay.
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate a price based on crop and location.
  // In a real application, you would use a library like Cheerio to scrape a government website
  // or call a dedicated market data API.
  const basePrice = Math.random() * 5000 + 2000; // Random price between 2000 and 7000
  const price = Math.round(basePrice);

  return {
    price,
    unit: 'quintal',
  };
}
