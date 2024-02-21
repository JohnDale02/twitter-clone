import { useState, useEffect, useRef } from 'react';
import { setMediaFromS3 } from '../cognito/config';

const useMediaGallery = (cameraNumber) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false); // Initialize loading state
  const lastFetchedCameraNumber = useRef(cameraNumber);
  const pollInterval = 3000; // Polling interval in milliseconds

  useEffect(() => {
    let intervalId;

    const fetchImages = async () => {
      if (cameraNumber && cameraNumber !== lastFetchedCameraNumber.current) {
        console.log('Fetching images from S3 due to camera number change');
        setLoading(true); // Start loading
        const media = await setMediaFromS3(cameraNumber); // Fetch images
        setImages(media);
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

export default useMediaGallery;
