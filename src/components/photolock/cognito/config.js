import AWS from 'aws-sdk';

//=============== AWS IDs ===============
var userPoolId = 'us-east-2_jgICLJECT';
var clientId = 'h1sablrdqstkqt90lsfr4fnip';
var region = 'us-east-2';
var identityPoolId = 'us-east-2:27d074d6-1504-4bbf-8394-45f8a4595b87';

export const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId
};

export const getCognitoIdentityCredentials = (idToken) => {
  AWS.config.region = region;

  var loginMap = {};
  loginMap['cognito-idp.' + region + '.amazonaws.com/' + userPoolId] = idToken;

  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: identityPoolId,
    Logins: loginMap
  });

  AWS.config.credentials.clearCachedId();

  AWS.config.credentials.get(function (err) {
    if (err) {
      console.log('There was an error getting credentials');
      console.log(err.message);
    } else {
      console.log('AWS Access Key: ' + AWS.config.credentials.accessKeyId);
      console.log('AWS Secret Key: ' + AWS.config.credentials.secretAccessKey);
      console.log('AWS Session Token: ' + AWS.config.credentials.sessionToken);
    }
  });
};

let signedUrlCache = {};

export const setPhotosFromS3 = async (globalCameraNumber) => {
  const getSignedUrl = (s3, bucketName, key) => {
    const currentTime = Date.now();
    const cacheKey = `${bucketName}/${key}`;

    if (signedUrlCache[cacheKey] && signedUrlCache[cacheKey].expiry > currentTime) {
      console.log('Cache hit, return the cached URL');
      return signedUrlCache[cacheKey].url;
    } else {
      const url = s3.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: key,
        Expires: 60000
      });
      signedUrlCache[cacheKey] = { url: url, expiry: currentTime + 60000 * 1000 };
      return url;
    }
  };

  const bucketName = `camera${globalCameraNumber}verifiedimages`;
  const s3 = new AWS.S3({ apiVersion: '2006-03-01', params: { Bucket: bucketName } });

  try {
    const data = await s3.listObjects({ Bucket: bucketName }).promise();

    data.Contents.sort((a, b) => b.LastModified - a.LastModified);
    const photos = data.Contents.filter(file => file.Key.endsWith('.png')).map(({ Key }) => {
      const imageUrl = getSignedUrl(s3, bucketName, Key);
      return { imageUrl: imageUrl, imageFilename: Key };
    });

    console.log('Photos:', photos);
    return photos;
  } catch (err) {
    console.error('There was an error viewing your album:', err.message);
    return [];
  }
};



export async function fetchImageAsBlob(imageKey, idToken, globalCameraNumber) {
  const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: region,
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: identityPoolId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
      }
    })
  });

  const bucketName = 'camera' + globalCameraNumber + 'verifiedimages';

  const imageParams = {
    Bucket: bucketName,
    Key: imageKey
  };

  try {
    const imageUrl = await s3.getSignedUrlPromise('getObject', imageParams);
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Network response was not ok.');
    return await response.blob();
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

////////////////// Json database /////////////

export async function processAndSendImage(blob) {
  try {
    const binaryImage = await blob.arrayBuffer(); 
    const response = await sendImageToAPI(binaryImage);

    const responseData = await response.json();  // Parse the response JSON

    if (response.ok) {
      // Check the result value in response
      if (responseData.result === "True") {
        // Return true with metadata
        return {
          isValid: true,
          metadata: responseData.metadata
        };
      } else {
        // Return false without metadata
        return {
          isValid: false,
          error: "Image is not valid; no metadata"
        };
      }
    } else {
      // Handle non-200 responses
      console.error('Error response from API:', responseData);
      return {
        isValid: false,
        error: responseData.error || 'Unknown error',
      };
    }

  } catch (error) {
    console.error('Error fetching image metadata:', error);
    return {
      isValid: false,
      error: 'Exception occurred while processing image',
    };
  }
}


async function sendImageToAPI(imageBinary) {
  const base64Image = btoa(new Uint8Array(imageBinary).reduce(
    (data, byte) => data + String.fromCharCode(byte), ''
  ));

  const response = await fetch('https://s3x144mrdk.execute-api.us-east-2.amazonaws.com/second', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ image: base64Image })
  });

  // Return the raw response
  return response;
}




export const preloadPhotosFromS3 = async (globalCameraNumber) => {

  const getSignedUrl = (s3, bucketName, key) => {
    // Cache miss, generate a new signed URL
    const url = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: key,
      Expires: 60000 // URL validity in seconds
    });

    return url;
    }
  
  const bucketName = 'camera' + globalCameraNumber + 'verifiedimages';
  const s3 = new AWS.S3({ apiVersion: '2006-03-01', params: { Bucket: bucketName }});

  try {
    const data = await s3.listObjects({ Bucket: bucketName }).promise();

    data.Contents.sort((a, b) => b.LastModified - a.LastModified);

    const files = data.Contents.reduce((acc, file) => {
      if (file.Key.endsWith('.png')) {
        acc.push({ pngKey: file.Key});
      }
      return acc;
    }, []);

    const photos = files.map(({ pngKey }) => ({
      imageUrl: getSignedUrl(s3, bucketName, pngKey),
      imageFilename: pngKey
    }));

    return photos;
  } catch (err) {
    console.error('There was an error viewing your album:', err.message);
    return [];
  }
};
