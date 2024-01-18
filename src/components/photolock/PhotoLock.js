// PhotoLock.js
import React, { useState, useEffect } from 'react';
import ImageGallery from './components/ImageGallery';
import ImageModal from './components/ImageModal';
import Slider from './components/Slider';
import SignatureModal from './components/SignatureModal';
import { downloadImageAndJson } from './cognito/config'; // Adjust the path as needed

import useAuthentication from './hooks/useAuthentication';
import useImageGallery from './hooks/useImageGallery';

import styles from './styles/login.module.css'; // Import as a module
import {
  CognitoUserPool,
  AuthenticationDetails,
  CognitoUser
} from 'amazon-cognito-identity-js';
import {
  poolData,
  getCognitoIdentityCredentials
} from 'components/photolock/cognito/config';

const PhotoLock = ({ photoLockCredentials }) => {
  const { isLoggedIn, userDetails, login, logout, errorMessage } =
    useAuthentication();

  const [fullImage, setFullImage] = useState(null);
  const [fullImageJson, setFullImageJson] = useState(null);
  const [imageFilename, setImageFilename] = useState('');
  const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);
  const [isFullImageVisible, setIsFullImageVisible] = useState(false);
  const [loginError, setLoginError] = useState(errorMessage);
  const [numColumns, setNumColumns] = useState(7);

  const images = useImageGallery(userDetails?.cameraNumber);
  console.log('Images we recieved are : ', images);

  const openFullImage = async (imageData) => {
    setFullImage(imageData.imageUrl);
    setImageFilename(imageData.imageFilename);
    setIsFullImageVisible(true);

    try {
      const response = await fetch(imageData.jsonUrl);
      const jsonData = await response.json();
      setFullImageJson(jsonData);
    } catch (error) {
      console.error('Error fetching JSON data:', error);
      setFullImageJson(null);
    }
  };

  const closeFullImage = () => {
    setFullImage(null);
    setIsFullImageVisible(false);
  };

  const openSignatureModal = () => {
    setIsSignatureModalVisible(true);
  };

  const closeSignatureModal = () => {
    setIsSignatureModalVisible(false);
  };

  const handleDownloadClick = () => {
    const imageKey = imageFilename;
    if (userDetails) {
      downloadImageAndJson(
        imageKey,
        userDetails.idToken,
        userDetails.cameraNumber
      );
    }
  };

  const onLoginSuccess = ({ username, password, idToken, cameraNumber }) => {
    console.log('CameraNumber onLoginSuccess passed to', cameraNumber);
    login({ username, password, idToken, cameraNumber });
    console.log('Login Success I think');
    setLoginError(''); // Clear any existing errors
  };

  const onLoginFailure = (errorMessage) => {
    console.log('Error logging in, yikes');
    setLoginError(errorMessage); // Set login error message
  };

  useEffect(() => {
    if (photoLockCredentials) {
      const { username, password } = photoLockCredentials;
      handleLogin(username, password);
    }
  }, [photoLockCredentials]);

  const handleLogin = (username, password) => {
    const userPool = new CognitoUserPool(poolData);
    const authenticationData = { Username: username, Password: password };
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    const userData = { Username: username, Pool: userPool };
    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        getCognitoIdentityCredentials(idToken);
        // Further actions on successful login
        cognitoUser.getUserAttributes((err, attributes) => {
          if (err) {
            // Handle error in fetching attributes
            console.log(err.message);
            onLoginFailure(err.message);
          } else {
            // Find the camera number attribute
            const cameraNumberAttribute = attributes.find(
              (attr) => attr.getName() === 'custom:camera_number'
            );
            const cameraNumber = cameraNumberAttribute
              ? cameraNumberAttribute.getValue()
              : null;

            // Pass idToken, email, and cameraNumber to the parent component
            console.log('Got cameranumber from Login Form: ', cameraNumber);
            onLoginSuccess({ username, password, idToken, cameraNumber });
          }
        });
      },
      onFailure: (err) => {
        console.error('Login failed:', err.message);
        // Handle login failure
      }
    });
  };

  return (
    <div className={styles.widget}>
      {!isLoggedIn ? (
        loginError && <div className={styles.errorMessage}>{loginError}</div>
      ) : (
        <>
          <Slider numColumns={numColumns} setNumColumns={setNumColumns} />
          <ImageGallery
            images={images}
            onImageSelect={openFullImage}
            numColumns={numColumns}
          />
          <ImageModal
            isVisible={isFullImageVisible}
            image={fullImage}
            imageJson={fullImageJson}
            imageFilename={imageFilename}
            onClose={closeFullImage}
            onDownloadClick={handleDownloadClick}
            openSignatureModal={openSignatureModal}
          />
          {fullImageJson?.['Signature_Base64'] && (
            <SignatureModal
              isVisible={isSignatureModalVisible}
              signature={fullImageJson['Signature_Base64']}
              onClose={closeSignatureModal}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PhotoLock;
