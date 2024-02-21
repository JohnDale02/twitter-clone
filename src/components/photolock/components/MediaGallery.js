import React from 'react';
import imageStyles from '../styles/images.module.css';
import LoadingIcon from './LoadingIcon'; // Import your loading icon component

const MediaGallery = ({ media, handleMediaSelect, numColumns = 3, loading }) => {
  console.log('Media:', media);
  return (
    <div className={imageStyles.imgGallery} style={{ '--num-columns': numColumns }}>
      {loading && (
        <div className={imageStyles.loadingOverlay}>
          <LoadingIcon />
        </div>
      )}
      {media && media.map((file, index) => {
        return file.isVideo ? (
          <div className={imageStyles.playButton}>
          <video
            key={file.mediaFilename}
            src={file.mediaUrl}
            alt={`Media ${index}`}
            onClick={() => handleMediaSelect(file.mediaFilename)}
          />
          </div>
        ) : (
          <img
            key={file.mediaFilename}
            src={file.mediaUrl}
            alt={`Media ${index}`}
            onClick={() => handleMediaSelect(file.mediaFilename)}
          />
        );
      })}
    </div>
  );
};

export default MediaGallery;