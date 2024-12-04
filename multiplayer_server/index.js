const axios = require("axios");

async function fetchPythPrice(priceFeedId) {
  try {
    const response = await axios.get(
      "https://hermes.pyth.network/api/latest_price_feeds",
      {
        params: {
          ids: [priceFeedId],
        },
      },
    );

    if (response.data && response.data.length > 0) {
      const priceFeed = response.data[0];

      // Convert price and confidence to human-readable format
      const price =
        parseFloat(priceFeed.price.price) * Math.pow(10, priceFeed.price.expo);
      const confidence =
        parseFloat(priceFeed.price.conf) * Math.pow(10, priceFeed.price.expo);
      console.log(priceFeed);
      return {
        id: priceFeed.id,
        price: price.toFixed(2),
        confidence: confidence.toFixed(2),
        publishTime: new Date(
          priceFeed.price.publish_time * 1000,
        ).toISOString(),
      };
    } else {
      throw new Error("Price feed not found");
    }
  } catch (error) {
    console.error("Error fetching Pyth price:", error);
    throw error;
  }
}

fetchPythPrice(
  "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
);
