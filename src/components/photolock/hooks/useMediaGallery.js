import { useState, useEffect, useRef } from 'react';
import { setMediaFromS3 } from '../cognito/config';

const useMediaGallery = (bucketName_fingerprint) => {
  console.log("useMediaGallery called");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false); // Initialize loading state
  const lastFetchedFingerprint = useRef(bucketName_fingerprint);
  const pollInterval = 3000; // Polling interval in milliseconds

  useEffect(() => {
    let intervalId;

    const fetchImages = async () => {
      console.log('Fetching images from S3 in useMediaGallery hook');
      if (bucketName_fingerprint && bucketName_fingerprint !== lastFetchedFingerprint.current) {
        console.log('Fetching images from S3 due to camera number change');
        setLoading(true); // Start loading
        const media = await setMediaFromS3(bucketName_fingerprint); // Fetch images
        setImages(media);
        lastFetchedFingerprint.current = bucketName_fingerprint;
        setLoading(false); // Stop loading once images are preloaded
      }
    };

    const intervalFunction = () => {
      fetchImages().catch(console.error); // Catch any errors thrown by fetchImages
    };

    console.log("bucketName_fingerprint in useMedia gallery: ", bucketName_fingerprint);

    if (bucketName_fingerprint) {
      fetchImages(); // Initial fetch
      intervalId = setInterval(intervalFunction, pollInterval); // Start polling
    }



    return () => {
      if (intervalId) {
        clearInterval(intervalId); // Clear interval on unmount
      }
    };
  }, [bucketName_fingerprint, pollInterval]);

  return { images, loading }; // Return both images and loading state
};

export default useMediaGallery;
