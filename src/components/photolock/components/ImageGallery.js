import React from 'react';
import imageStyles from '../styles/images.module.css';
import LoadingIcon from '../components/LoadingIcon'; // Import your loading icon component

const ImageGallery = ({ images, handleImageSelect, numColumns = 3, loading }) => {
  return (
    <div className={imageStyles.imgGallery} style={{ '--num-columns': numColumns }}>
      {loading && (
        <div className={imageStyles.loadingOverlay}>
          <LoadingIcon />
        </div>
      )}
      {images.map((image, index) => (
          <img 
          key={image.imageFilename}
          src={image.imageUrl} 
          alt={`Image ${index}`} 
          className={imageStyles.image} 
          onClick={() => handleImageSelect(image.imageFilename)} 
          />
      ))}
    </div>
  );
};

export default ImageGallery;



