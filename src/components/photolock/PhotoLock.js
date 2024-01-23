import React, { useState, useEffect } from 'react';
import ImageGallery from './components/ImageGallery';
import Slider from './components/Slider';
import useAuthentication from './hooks/useAuthentication';
import useImageGallery from './hooks/useImageGallery';
import styles from './styles/login.module.css';
import LoadingIcon from './components/LoadingIcon'; // Make sure you have this component

const PhotoLock = ({ photoLockCredentials, handleAuthImageUpload }) => {
  const { isLoggedIn, userDetails, login, errorMessage } = useAuthentication();
  const [loginError, setLoginError] = useState(errorMessage);
  const [numColumns, setNumColumns] = useState(4);
  const { images, loading } = useImageGallery(userDetails?.cameraNumber);
  const [isLoadingImage, setIsLoadingImage] = useState(false);


  useEffect(() => {
    if (photoLockCredentials && !isLoggedIn) {
      const { username, password } = photoLockCredentials;
      login({ username, password });
    }
  }, [photoLockCredentials, isLoggedIn, login]);

  const handleImageSelect = async (imageKey) => {
    if (userDetails) {
      setIsLoadingImage(true);
      try{
        await handleAuthImageUpload(
          imageKey,
          userDetails.idToken,
          userDetails.cameraNumber
        );
      } catch (error) {
        console.error('Error uploading image:', error);
      }
      setIsLoadingImage(false);
    }
  };

  return (
    <div className={styles.widget}>
      {!isLoggedIn ? (
        loginError && <div className={styles.errorMessage}>{loginError}</div>
      ) : loading || !images.length ? ( // Check if loading or no images are available yet
          <LoadingIcon /> // Show loading icon if images are loading or not available
        ) : (
          <>
            <Slider numColumns={numColumns} setNumColumns={setNumColumns} />
            <ImageGallery
              images={images}
              handleImageSelect={handleImageSelect}
              numColumns={numColumns}
              loading={isLoadingImage}
            />
          </>
        )
      }
    </div>
  );
};

export default PhotoLock;
