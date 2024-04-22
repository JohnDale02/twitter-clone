/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cn from 'clsx';
import { preventBubbling } from '@lib/utils';
import { Button } from '@components/ui/button';
import { HeroIcon } from '@components/ui/hero-icon';
import { Loading } from '@components/ui/loading';
import { backdrop, modal } from './modal';
import type { VariantLabels } from 'framer-motion';
import type { ImageData } from '@lib/types/file';
import type { IconName } from '@components/ui/hero-icon';
import styles from '../../components/photolock/styles/signature.module.css'


type ImageModalProps = {
  tweet?: boolean;
  imageData: ImageData;
  previewCount: number;
  selectedIndex?: number;
  handleNextIndex?: (type: 'prev' | 'next') => () => void;
};

type ArrowButton = ['prev' | 'next', string | null, IconName];

const arrowButtons: Readonly<ArrowButton[]> = [
  ['prev', null, 'ArrowLeftIcon'],
  ['next', 'order-1', 'ArrowRightIcon']
];

export function ImageModal({
  tweet,
  imageData,
  previewCount,
  selectedIndex,
  handleNextIndex
}: ImageModalProps): JSX.Element {
  const [indexes, setIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false); ///////// ADDED ////////////////////
  const [showSignatureModal, setShowSignatureModal] = useState(false); ///////// ADDED ////////////////////
  ////////////////////////////////////////////////////////////

  const handleSignatureModalToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Stop click event from reaching the metadata click handler
    if (event) event.stopPropagation();
    
    setShowSignatureModal(!showSignatureModal);
  };

  const handleMetadataClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation(); 
    if (isValid) {
      setShowMetadata(!showMetadata);
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {   // for allowing metadata to be opened and closed by clicking on the image
    if (showMetadata) {
      event.stopPropagation(); // Prevent the event from reaching the outer click handler
      setShowMetadata(false);
    }
    // If there's additional logic for when the image is clicked, it can go here
  };
  

  ///////////////////////////////////////////////////////////

  const { src, alt, isValid } = imageData;
  const isVideo = alt?.endsWith('.mp4') 

  const requireArrows = handleNextIndex && previewCount > 1;

  useEffect(() => {
    if (
      tweet &&
      selectedIndex !== undefined &&
      !indexes.includes(selectedIndex)
    ) {
      setLoading(true);
      setIndexes([...indexes, selectedIndex]);
    }
    const media = isVideo ? document.createElement('video') : new Image();
    media.src = src;

    const handleLoadingCompleted = (): void => setLoading(false);

    if (isVideo) media.onloadeddata = handleLoadingCompleted;
    else media.onload = handleLoadingCompleted;
  }, [...(tweet && previewCount > 1 ? [src] : [])]);

  useEffect(() => {
    if (!requireArrows) return;

    const handleKeyDown = ({ key }: KeyboardEvent): void => {
      const callback =
        key === 'ArrowLeft'
          ? handleNextIndex('prev')
          : key === 'ArrowRight'
          ? handleNextIndex('next')
          : null;

      if (callback) callback();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNextIndex]);

  return (
    <>
      {requireArrows &&
        arrowButtons.map(([name, className, iconName]) => (
          <Button
            className={cn(
              `absolute z-10 hover:bg-light-primary/10 active:bg-light-primary/20
               dark:hover:bg-dark-primary/10 dark:active:bg-dark-primary/20`,
              name === 'prev' ? 'left-2' : 'right-2',
              className
            )}
            onClick={preventBubbling(handleNextIndex(name))}
            key={name}
          >
            <HeroIcon iconName={iconName} />
          </Button>
        ))}
      <AnimatePresence mode='wait'>
        {loading ? (
          <motion.div
            className='mx-auto'
            {...backdrop}
            exit={tweet ? (backdrop.exit as VariantLabels) : undefined}
            transition={{ duration: 0.15 }}
          >
            <Loading iconClassName='w-20 h-20' />
          </motion.div>
        ) : (
          <motion.div className='relative mx-auto' {...modal} key={src}>
            {isVideo ? (
              <div className='group relative flex max-w-3xl'>
                <video
                  className={cn(
                    'max-h-[75vh] rounded-md object-contain md:max-h-[80vh]',
                    loading ? 'hidden' : 'block'
                  )}
                  src={src}
                  autoPlay
                  controls
                  onClick={preventBubbling()}
                >
                  <source srcSet={src} type='video/*' />
                </video>
                  {isValid && (
                  <>
                  <div
                    className='trim-alt accent-tab absolute bottom-14 left-0 mx-2 mb-2 translate-y-4 rounded-md bg-main-background/40 px-2 py-1 text-sm text-light-primary/80 opacity-0 transition hover:bg-main-accent hover:text-white focus-visible:translate-y-0 focus-visible:bg-main-accent focus-visible:text-white focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 dark:text-dark-primary/80'
                    onClick={handleMetadataClick}
                    >
                    Verified by PhotoLock
                  </div>
                  {showMetadata && imageData.metadata && (
                    <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg p-4'
                    onClick={handleMetadataClick}
                    >
                      <div className='text-center text-white rounded-lg p-4 bg-opacity-80'>
                        <div className='text-lg font-semibold'>Fingerprint: <span className='font-light'>{imageData.metadata.fingerprint}</span></div>
                        <div className='text-lg font-semibold'>Camera Number: <span className='font-light'>{imageData.metadata.camera_number}</span></div>
                        <div className='text-lg font-semibold'>Location: <span className='font-light'>{imageData.metadata.location_data}</span></div>
                        <div className='text-lg font-semibold'>Time: <span className='font-light'>{imageData.metadata.time_data}</span></div>
                        {/* Center the button below the Time */}
                        <div className='mt-4 flex justify-center'> {/* Flexbox container for centering the button */}
                          <button
                            className='text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded cursor-pointer' // Example button styles, replace with your own classes
                            onClick={(event) => handleSignatureModalToggle(event)} // Pass the click event to the toggle function
                          >
                            View Signature
                          </button>
                        </div>
                      </div>
                      {showSignatureModal && (
                        <div className={styles.signatureModalBackground}>
                          <div className={styles.signatureModalContent}>
                            {/* Signature modal header section */}
                            <div className={styles.signatureModalHeader}>
                              <h2 className={styles.signatureTitle}>Signature</h2>
                              <button className={styles.closeSignatureButton} onClick={(event) => handleSignatureModalToggle(event)}>
                                &times;
                              </button>
                            </div>
                            <div className={styles.signatureText}>
                              {imageData.metadata.signature}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <img 
                    src='/assets/check.png'
                    alt="Verified" 
                    className='absolute top-0 right-0 w-[25%] opacity-0 transition hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100' 
                    onClick={handleImageClick}
                  />
                  </>
                )}
                <a
                  className='trim-alt accent-tab absolute bottom-14 right-0 mx-2 mb-2 translate-y-4
                            rounded-md bg-main-background/40 px-2 py-1 text-sm text-light-primary/80 opacity-0
                            transition hover:bg-main-accent hover:text-white focus-visible:translate-y-0
                            focus-visible:bg-main-accent focus-visible:text-white focus-visible:opacity-100
                            group-hover:translate-y-0 group-hover:opacity-100 dark:text-dark-primary/80'
                  href={src}
                  target='_blank'
                  rel='noreferrer'
                  onClick={preventBubbling(null, true)}
                >
                  {alt}
                </a>
              </div>
            ) : (
            <picture className='group relative flex max-w-3xl'>
              <source srcSet={src} type='image/*' />
              <img
                className='max-h-[75vh] rounded-md object-contain md:max-h-[80vh]'
                src={src}
                alt={alt}
                onClick={preventBubbling()}
              />
              {/* Add the verified badge here */}
              {isValid && (
                <>
                <div
                  className='trim-alt accent-tab absolute bottom-0 left-0 mx-2 mb-2 translate-y-4 rounded-md bg-main-background/40 px-2 py-1 text-sm text-light-primary/80 opacity-0 transition hover:bg-main-accent hover:text-white focus-visible:translate-y-0 focus-visible:bg-main-accent focus-visible:text-white focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 dark:text-dark-primary/80'
                  onClick={handleMetadataClick}
                  >
                  Verified by PhotoLock
                </div>
                {showMetadata && imageData.metadata && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg p-4'
                  onClick={handleMetadataClick}
                  >
                    <div className='text-center text-white rounded-lg p-4 bg-opacity-80'>
                      <div className='text-lg font-semibold'>Fingerprint: <span className='font-light'>{imageData.metadata.fingerprint}</span></div>
                      <div className='text-lg font-semibold'>Camera Number: <span className='font-light'>{imageData.metadata.camera_number}</span></div>
                      <div className='text-lg font-semibold'>
                        Location: <span className='font-light'>
                          {imageData.metadata.location_data === "None, None" ? "N/A" : imageData.metadata.location_data}
                        </span>
                      </div>
                      <div className='text-lg font-semibold'>
                        Time: <span className='font-light'>
                          {imageData.metadata.time_data === "None" ? "N/A" : imageData.metadata.time_data}
                        </span>
                      </div>
                      <div className='text-lg font-semibold'>Signature: <span className='font-light'>{imageData.metadata.signature}</span></div>
                      {/* Signature is intentionally omitted */}
                    </div>
                  </div>
                )}
                <img 
                  src='/assets/check.png'
                  alt="Verified" 
                  className='absolute top-0 right-0 w-[25%] opacity-0 transition hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100' 
                  onClick={handleImageClick}
                />
                </>
              )}
              <a
                className='trim-alt accent-tab absolute bottom-0 right-0 mx-2 mb-2 translate-y-4
                           rounded-md bg-main-background/40 px-2 py-1 text-sm text-light-primary/80 opacity-0
                           transition hover:bg-main-accent hover:text-white focus-visible:translate-y-0
                           focus-visible:bg-main-accent focus-visible:text-white focus-visible:opacity-100
                           group-hover:translate-y-0 group-hover:opacity-100 dark:text-dark-primary/80'
                href={src}
                target='_blank'
                rel='noreferrer'
                onClick={preventBubbling(null, true)}
              >
                {alt}
              </a>
            </picture>
            )}
            <a
              className='custom-underline absolute left-0 -bottom-7 font-medium text-light-primary/80
                         decoration-transparent underline-offset-2 transition hover:text-light-primary hover:underline
                         hover:decoration-light-primary focus-visible:text-light-primary dark:text-dark-primary/80 
                         dark:hover:text-dark-primary dark:hover:decoration-dark-primary dark:focus-visible:text-dark-primary'
              href={src}
              target='_blank'
              rel='noreferrer'
              onClick={preventBubbling(null, true)}
            >
              Open original
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
