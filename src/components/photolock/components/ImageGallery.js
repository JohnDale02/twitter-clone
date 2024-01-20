import React from 'react';
import imageStyles from '../styles/images.module.css';

const ImageGallery = ({ images, handleImageSelect, numColumns = 3 }) => {
  console.log('Images in Gallery function: ' + images); // Place this in `Login.js` and `ImageGallery.js`

  return (
    <div
      className={imageStyles.imgGallery}
      style={{ '--num-columns': numColumns }}
    >
      {images.map((image, index) => (
        <img
          key={index}
          src={image.imageUrl}
          alt={`Image ${index}`}
          onClick={() => handleImageSelect(image.imageFilename)}
        />
      ))}
    </div>
  );
};

export default ImageGallery;
