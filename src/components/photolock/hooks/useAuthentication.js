import { useState } from 'react';
import { CognitoUserPool, AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { poolData, getCognitoIdentityCredentials } from '../cognito/config';

const useAuthentication = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const login = async ({ username, password }) => {
    if (isLoggedIn) {
      console.log('Already logged in');
      return;
    }

    console.log('useAuthentication hook called');
    try {
      const userPool = new CognitoUserPool(poolData);
      const authenticationData = { Username: username, Password: password };
      const authenticationDetails = new AuthenticationDetails(authenticationData);
      const userData = { Username: username, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
          const idToken = result.getIdToken().getJwtToken();
          getCognitoIdentityCredentials(idToken);
          setIsLoggedIn(true);

          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('Error fetching user attributes:', err);
              return;
            }

            const cameraNumberAttribute = attributes.find(
              (attr) => attr.getName() === 'custom:camera_number'
            );

            const cameraNumber = cameraNumberAttribute
              ? cameraNumberAttribute.getValue()
              : null;

            setUserDetails({ username, idToken, cameraNumber });
          });
        },
        onFailure: function (err) {
          setErrorMessage(err.message || 'Login failed');
        }
      });
    } catch (error) {
      setErrorMessage('An error occurred during login');
      console.error('Login error:', error);
    }
  };

  const logout = () => {
    const userPool = new CognitoUserPool(poolData);
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setIsLoggedIn(false);
    setUserDetails(null);
  };

  return { isLoggedIn, userDetails, login, logout, errorMessage };
};

export default useAuthentication;
