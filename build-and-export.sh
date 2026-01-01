#!/bin/bash
# Script to build and export canvas Docker image for deployment

set -e

IMAGE_NAME="canvas"
IMAGE_TAG="latest"
OUTPUT_FILE="canvas-latest.tar.gz"

echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "Saving image to ${OUTPUT_FILE}..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${OUTPUT_FILE}

echo "Done! Image saved to ${OUTPUT_FILE}"
echo "File size: $(du -h ${OUTPUT_FILE} | cut -f1)"
echo ""
echo "To transfer to your server:"
echo "  scp ${OUTPUT_FILE} user@your-server:/path/to/destination/"
echo ""
echo "On your server, load it with:"
echo "  gunzip -c ${OUTPUT_FILE} | docker load"

