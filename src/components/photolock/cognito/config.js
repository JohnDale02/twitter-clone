import AWS from 'aws-sdk';

//=============== AWS IDs ===============
var userPoolId = 'us-east-2_0cV1pXRAu';
var clientId = '1qvjvm0slqct6r8sibps8ogt47';
var region = 'us-east-2';
var identityPoolId = 'us-east-2:d1807790-6713-47b5-8e18-f45270fd9686';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

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

export const setMediaFromS3 = async (globalBucketName_fingerprint) => {
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

  console.log("Bucket name in setMedia from S3", globalBucketName_fingerprint);
  const bucketName = globalBucketName_fingerprint;
  const s3 = new AWS.S3({ apiVersion: '2006-03-01', params: { Bucket: bucketName } });

  try {
    const data = await s3.listObjects({ Bucket: bucketName }).promise();

    data.Contents.sort((a, b) => b.LastModified - a.LastModified);

    const mediaItems = data.Contents.filter(file => file.Key.endsWith('.png') || file.Key.endsWith('.mp4')).map(({ Key }) => {
      const mediaUrl = getSignedUrl(s3, bucketName, Key);
      return { mediaUrl: mediaUrl, mediaFilename: Key, isVideo: Key.endsWith('.mp4')};
    });

    console.log('Media:', mediaItems);
    return mediaItems;
  } catch (err) {
    console.error('There was an error viewing your album:', err.message);
    return [];
  }
};


export async function fetchMediaAsBlob(mediaKey, idToken, globalBucketName_fingerprint) {
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

  // ###############################################
  // if it is a video we need to get the AVI blob here not the mp4 blob
  // ###############################################
  const bucketName = globalBucketName_fingerprint;

  const imageParams = {
    Bucket: bucketName,
    Key: mediaKey
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

export async function processAndSendMedia(blob, type) {
  try {
    const binaryMedia = await blob.arrayBuffer(); 
    const response = await sendMediaToAPI(binaryMedia, type);

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


async function sendMediaToAPI(mediaBinary, type) {
  const base64Image = btoa(new Uint8Array(mediaBinary).reduce(
    (data, byte) => data + String.fromCharCode(byte), ''
  ));

  const response = await fetch('https://s3x144mrdk.execute-api.us-east-2.amazonaws.com/second', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ image: base64Image, type: type})
  });

  // Return the raw response
  return response;
}


export async function getMediaBlobs(mediaKey, idToken, globalBucketName_fingerprint) {
  let displayBlob, verifyBlob;

  if (mediaKey.endsWith('.mp4')) {
    displayBlob = await fetchMediaAsBlob(mediaKey, idToken, globalBucketName_fingerprint);
    const aviMediaKey = mediaKey.replace('.mp4', '.avi');
    verifyBlob = await fetchMediaAsBlob(aviMediaKey, idToken, globalBucketName_fingerprint);

  } else if (mediaKey.endsWith('.png')) {
    // For both display and API (if needed), since it's the same for images
    displayBlob = await fetchMediaAsBlob(mediaKey, idToken, globalBucketName_fingerprint);
    verifyBlob = displayBlob; // You can use the same blob for verification if needed
  }

  return { displayBlob, verifyBlob };
}

// Configure the AWS Region and Lambda function name
AWS.config.update({
  region: 'us-east-2',
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
});

var lambda = new AWS.Lambda();

export async function uploadAndConvertFile(blob) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function() {
          const arrayBuffer = reader.result;
          const base64avi = arrayBufferToBase64(arrayBuffer);

          // Correctly structure the Lambda payload
          const lambdaPayload = {
              body: JSON.stringify({ avi_data: base64avi }) // Ensure 'avi_data' matches the key expected by your Lambda function
          };

          // Prepare the parameters for invoking Lambda
          const params = {
              FunctionName: 'AVIupload', // Replace with your Lambda function's ARN
              InvocationType: 'RequestResponse',
              LogType: 'None',
              Payload: JSON.stringify(lambdaPayload) // Payload is now a stringified version of lambdaPayload
          };

          // Invoke the Lambda function
          lambda.invoke(params, function(err, data) {
              if (err) {
                  console.error('Error invoking Lambda:', err);
                  reject(err);
              } else {
                  console.log('Lambda call succeeded:', data);
                  const responsePayload = JSON.parse(data.Payload); // Parse the Lambda function's response payload
                  if (responsePayload.statusCode === 200) {
                      const responseBody = JSON.parse(responsePayload.body); // Parse the body within the Lambda response
                      const mp4Base64 = responseBody.mp4_base64;

                      // Convert base64 back to a blob
                      const mp4Blob = base64ToBlob(mp4Base64, 'video/mp4');
                      resolve(mp4Blob);
                      console.log('MP4 Blob was resolved');
                  } else {
                      // Handle possible errors returned from the Lambda function
                      const error = new Error(`Lambda function returned error: ${responsePayload.body}`);
                      console.error(error);
                      reject(error);
                  }
              }
          });
      };

      reader.onerror = function(error) {
          console.error('FileReader error:', error);
          reject(error);
      };

      reader.readAsArrayBuffer(blob);
  });
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = window.atob(base64);
  const byteNumbers = new Array(byteCharacters.length).fill(null).map((_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
