import { useState } from 'react';
import {
  CognitoUserPool,
  AuthenticationDetails,
  CognitoUser
} from 'amazon-cognito-identity-js';
import { poolData, getCognitoIdentityCredentials } from '../cognito/config';

const useAuthentication = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const login = async ({ username, password, idToken, cameraNumber }) => {
    console.log('useAuthentication hook called');

    try {
      const userPool = new CognitoUserPool(poolData);
      const authenticationData = { Username: username, Password: password };
      const authenticationDetails = new AuthenticationDetails(
        authenticationData
      );
      const userData = { Username: username, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
          getCognitoIdentityCredentials(idToken);
          setIsLoggedIn(true);
          console.log('isLoggedIn: ', isLoggedIn);
          console.log('Cameranumber in login: ', cameraNumber);
          setUserDetails({ username, idToken, cameraNumber }); // You can add more user details here
        },
        onFailure: function (err) {
          console.log('Wrong in useAuthntication: ', err.message);
          setErrorMessage(err.message || 'Login failed');
        }
      });
    } catch (error) {
      setErrorMessage('An error occurred during login');
      console.error('Login error:', error);
    }
  };

  const logout = () => {
    if (userPool) {
      userPool.getCurrentUser().signOut();
    }
    setIsLoggedIn(false);
    setUserDetails(null);
  };

  return { isLoggedIn, userDetails, login, logout, errorMessage };
};

export default useAuthentication;
