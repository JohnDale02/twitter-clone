// input.tsx
import Link from 'next/link';
import { useState, useEffect, useRef, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cn from 'clsx';
import { toast } from 'react-hot-toast';
import { addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { tweetsCollection } from '@lib/firebase/collections';
import {
  manageReply,
  uploadImages,
  manageTotalTweets,
  manageTotalPhotos
} from '@lib/firebase/utils';
import { useAuth } from '@lib/context/auth-context';
import { sleep } from '@lib/utils';
import { getImagesData } from '@lib/validation';
import { UserAvatar } from '@components/user/user-avatar';
import { InputForm, fromTop } from './input-form';
import { ImagePreview } from './image-preview';
import { InputOptions } from './input-options';
import type { ReactNode, FormEvent, ChangeEvent, ClipboardEvent } from 'react';
import type { WithFieldValue } from 'firebase/firestore';
import type { Variants } from 'framer-motion';
import type { User } from '@lib/types/user';
import type { Tweet } from '@lib/types/tweet';
import type { FilesWithId, ImagesPreview, ImageData } from '@lib/types/file';

import PhotoLock from '../photolock/PhotoLock'; ///////// Added
import { ErrorType } from 'aws-sdk/clients/es';
import PhotoLockModal from '../modal/photo-lock-modal';
import { getMediaBlobs, processAndSendMedia } from '../photolock/cognito/config';


const uniqueId = () => {
  return Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
};

type InputProps = {
  modal?: boolean;
  reply?: boolean;
  parent?: { id: string; username: string };
  disabled?: boolean;
  children?: ReactNode;
  replyModal?: boolean;
  closeModal?: () => void;
};

export const variants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
};

export function Input({
  modal,
  reply,
  parent,
  disabled,
  children,
  replyModal,
  closeModal
}: InputProps): JSX.Element {
  const [selectedImages, setSelectedImages] = useState<FilesWithId>([]);
  const [imagesPreview, setImagesPreview] = useState<ImagesPreview>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [visited, setVisited] = useState(false);

  const [isPhotoLockVisible, setIsPhotoLockVisible] = useState(false); ///////////// Added


  const { user, isAdmin } = useAuth();
  const { name, username, photoURL } = user as User;

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const previewCount = imagesPreview.length;
  const isUploadingImages = !!previewCount;

  const photoLockCredentials = {
    username: user?.photolockusername,
    password: user?.photolockpassword
  };

  useEffect(
    () => {
      if (modal) inputRef.current?.focus();
      return cleanImage;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const sendTweet = async (): Promise<void> => {
    inputRef.current?.blur();

    setLoading(true);

    const isReplying = reply ?? replyModal;

    const userId = user?.id as string;

    const tweetData: WithFieldValue<Omit<Tweet, 'id'>> = {
      text: inputValue.trim() || null,
      parent: isReplying && parent ? parent : null,
      images: await uploadImages(userId, selectedImages),
      userLikes: [],
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: null,
      userReplies: 0,
      userRetweets: []
    };

    await sleep(500);

    console.log('tweetData:', tweetData);
    const [tweetRef] = await Promise.all([
      addDoc(tweetsCollection, tweetData),
      manageTotalTweets('increment', userId),
      tweetData.images && manageTotalPhotos('increment', userId),
      isReplying && manageReply('increment', parent?.id as string)
    ]);

    const { id: tweetId } = await getDoc(tweetRef);

    if (!modal && !replyModal) {
      discardTweet();
      setLoading(false);
    }

    if (closeModal) closeModal();

    toast.success(
      () => (
        <span className='flex gap-2'>
          Your Tweet was sent
          <Link href={`/tweet/${tweetId}`}>
            <a className='custom-underline font-bold'>View</a>
          </Link>
        </span>
      ),
      { duration: 6000 }
    );
  };

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement> | ClipboardEvent<HTMLTextAreaElement>
  ): Promise<void> => {
    const isClipboardEvent = 'clipboardData' in e;

    if (isClipboardEvent) {
      const isPastingText = e.clipboardData.getData('text');
      if (isPastingText) return;
    }

    const files = isClipboardEvent ? e.clipboardData.files : e.target.files;

    const imagesData = await getImagesData(files, previewCount);

    if (!imagesData) {
      toast.error('Please choose a GIF or photo up to 4');
      return;
    }

    const { imagesPreviewData, selectedImagesData } = imagesData;

    setImagesPreview([...imagesPreview, ...imagesPreviewData]);
    setSelectedImages([...selectedImages, ...selectedImagesData]);

    inputRef.current?.focus();
  };

  const removeImage = (targetId: string) => (): void => {
    setSelectedImages(selectedImages.filter(({ id }) => id !== targetId));
    setImagesPreview(imagesPreview.filter(({ id }) => id !== targetId));

    const { src } = imagesPreview.find(
      ({ id }) => id === targetId
    ) as ImageData;

    URL.revokeObjectURL(src);
  };

  const cleanImage = (): void => {
    imagesPreview.forEach(({ src }) => URL.revokeObjectURL(src));

    setSelectedImages([]);
    setImagesPreview([]);
  };

  const discardTweet = (): void => {
    setInputValue('');
    setVisited(false);
    cleanImage();

    inputRef.current?.blur();
  };

  const handleChange = ({
    target: { value }
  }: ChangeEvent<HTMLTextAreaElement>): void => setInputValue(value);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void sendTweet();
  };

  const handleFocus = (): void => setVisited(!loading);

  //// Added ///////////

  const togglePhotoLockVisibility = () => {
    setIsPhotoLockVisible(!isPhotoLockVisible);
  };

  const onAuthMediaClick = (): void => {
    togglePhotoLockVisibility();
  };

  const handleAuthMediaUpload = async (
    mediaKey: string,
    idToken: string,
    globalBucketName_fingerprint: string
  ) => {
    console.log(
      'Downloading Image for tweet: ImageKey: ',
      mediaKey,
      'fingerprint: ',
      globalBucketName_fingerprint
    );

///////////////////////////////////////////////////////////////////////////////
    try {
      
      let fileName: string;
      let fileType
      // Generate a unique ID for the image
      const uniqueImageId = uniqueId();

      const { displayBlob, verifyBlob } = await getMediaBlobs(mediaKey, idToken, globalBucketName_fingerprint); 

      if (!displayBlob) {
        console.error('Failed to fetch display blob');
        // Handle the error case here (e.g., display a message to the user)
        return;
      }

      let type; 

      if (mediaKey.endsWith('.mp4')) {   // if the file is a video that they want to upload, 
        console.log("Media ends with .mp4, we are using tyhpe video/avi for api call");
        type = 'video/avi';

        // If the mediaKey ends with .mp4, set fileName and fileType for a video file
        fileName = `${uniqueImageId}.mp4`;
        fileType = 'video/mp4';

      } else {
        console.log("Media ends with .png, we are using type image/png for api call");
        type = 'image/png';

        fileName = `${uniqueImageId}.png`;
        fileType = 'image/png';
      }
      
      //##########################################################
      // ------------------- PHOTOLOCK DIRECT -----------------
      //##########################################################
      console.log("Photolock direct input: processing...")
      const result = await processAndSendMedia(verifyBlob, type);
      
      if (result.isValid) {
        console.log('Image is valid. Metadata:', result.metadata);
      } else {
        console.log(result.error);
      }

///////////////////////////////////////////////////////////////////////////////

      const file = new File([displayBlob], fileName, { type: fileType });

      // Add id property to the file
      const fileWithId = Object.assign(file, { 
        id: uniqueImageId, 
        isValid: result.isValid,
        metadata: result.metadata !== undefined ? result.metadata : null}); /////////////////// ADDING metadata and isValid to file

      // Update selected images and image previews
      setSelectedImages((prevSelectedImages) => [
        ...prevSelectedImages,
        fileWithId
      ]);
      setImagesPreview((prevImagesPreview) => [
        ...prevImagesPreview,
        {
          id: uniqueImageId,
          src: URL.createObjectURL(displayBlob),
          alt: fileName,
          isValid: result.isValid,
          metadata: result.metadata !== undefined ? result.metadata : null
        }
      ]);

      togglePhotoLockVisibility();
    } catch (error) {
      console.error('Error fetching image:', error);
    }
  };

  /////////////////////////

  const formId = useId();

  const inputLimit = isAdmin ? 560 : 280;

  const inputLength = inputValue.length;
  const isValidInput = !!inputValue.trim().length;
  const isCharLimitExceeded = inputLength > inputLimit;

  const isValidTweet =
    !isCharLimitExceeded && (isValidInput || isUploadingImages);

  return (
    <>
      {isPhotoLockVisible && (
        <PhotoLockModal
          isOpen={isPhotoLockVisible}
          onClose={togglePhotoLockVisibility}
        >
          <PhotoLock
            photoLockCredentials={photoLockCredentials}
            handleAuthMediaUpload={handleAuthMediaUpload}
          />
        </PhotoLockModal>
      )}

      <form
        className={cn('flex flex-col', {
          '-mx-4': reply,
          'gap-2': replyModal,
          'cursor-not-allowed': disabled
        })}
        onSubmit={handleSubmit}
      >
        {loading && (
          <motion.i
            className='h-1 animate-pulse bg-main-accent'
            {...variants}
          />
        )}
        {children}
        {reply && visited && (
          <motion.p
            className='-mb-2 ml-[75px] mt-2 text-light-secondary dark:text-dark-secondary'
            {...fromTop}
          >
            Replying to{' '}
            <Link href={`/user/${parent?.username}`}>
              <a className='custom-underline text-main-accent'>
                {parent?.username}
              </a>
            </Link>
          </motion.p>
        )}
        <label
          className={cn(
            'hover-animation grid w-full grid-cols-[auto,1fr] gap-3 px-4 py-3',
            reply
              ? 'pb-1 pt-3'
              : replyModal
              ? 'pt-0'
              : 'border-b-2 border-light-border dark:border-dark-border',
            (disabled || loading) && 'pointer-events-none opacity-50'
          )}
          htmlFor={formId}
        >
          <UserAvatar src={photoURL} alt={name} username={username} />
          <div className='flex w-full flex-col gap-4'>
            <InputForm
              modal={modal}
              reply={reply}
              formId={formId}
              visited={visited}
              loading={loading}
              inputRef={inputRef}
              replyModal={replyModal}
              inputValue={inputValue}
              isValidTweet={isValidTweet}
              isUploadingImages={isUploadingImages}
              sendTweet={sendTweet}
              handleFocus={handleFocus}
              discardTweet={discardTweet}
              handleChange={handleChange}
              handleImageUpload={handleImageUpload}
            >
              {isUploadingImages && (
                <ImagePreview
                  imagesPreview={imagesPreview}
                  previewCount={previewCount}
                  removeImage={removeImage}
                />
              )}
            </InputForm>
            <AnimatePresence initial={false}>
              {(reply ? reply && visited && !loading : !loading) && (
                <InputOptions
                  reply={reply}
                  modal={modal}
                  inputLimit={inputLimit}
                  inputLength={inputLength}
                  isValidTweet={isValidTweet}
                  isCharLimitExceeded={isCharLimitExceeded}
                  handleImageUpload={handleImageUpload}
                  onAuthMediaClick={onAuthMediaClick}
                />
              )}
            </AnimatePresence>
          </div>
        </label>
      </form>
    </>
  );
}
