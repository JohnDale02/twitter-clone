import { useState, useEffect, useRef } from 'react';
import { setPhotosFromS3 } from '../cognito/config';

const useImageGallery = (cameraNumber) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false); // Initialize loading state
  const lastFetchedCameraNumber = useRef(cameraNumber);
  const pollInterval = 3000; // Polling interval in milliseconds

  const preloadImages = async (photos) => {
    const preloadPromises = photos.map((photo) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = photo.imageUrl;
        img.onload = resolve; // Resolve promise once image is loaded
      });
    });

    // Wait for all images to be preloaded
    await Promise.all(preloadPromises);
    return photos;
  };

  useEffect(() => {
    let intervalId;

    const fetchImages = async () => {
      if (cameraNumber && cameraNumber !== lastFetchedCameraNumber.current) {
        console.log('Fetching images from S3 due to camera number change');
        setLoading(true); // Start loading
        const photos = await setPhotosFromS3(cameraNumber); // Fetch images
        const preloadedPhotos = await preloadImages(photos); // Preload images
        setImages(preloadedPhotos);
        lastFetchedCameraNumber.current = cameraNumber;
        setLoading(false); // Stop loading once images are preloaded
      }
    };

    const intervalFunction = () => {
      fetchImages().catch(console.error); // Catch any errors thrown by fetchImages
    };

    if (cameraNumber) {
      fetchImages(); // Initial fetch
      intervalId = setInterval(intervalFunction, pollInterval); // Start polling
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId); // Clear interval on unmount
      }
    };
  }, [cameraNumber, pollInterval]);

  return { images, loading }; // Return both images and loading state
};

export default useImageGallery;
