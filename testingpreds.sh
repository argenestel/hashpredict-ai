#!/bin/bash

END=$((SECONDS+10000))

while [ $SECONDS -lt $END ]; do
    echo "Sending request to generate predictions..."
    curl -X POST -H "Content-Type: application/json" -d '{"topic":"Artificial Intelligence"}' https://hashpredict-ai.onrender.com/test/generate-predictions
    echo -e "\n\nWaiting 2 seconds before next request...\n"
    sleep 15
done

echo "Test completed."
