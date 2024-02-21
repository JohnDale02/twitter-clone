import { getRandomId } from './random';
import type { FilesWithId, FileWithId, ImagesPreview } from './types/file';
import { processAndSendMedia, uploadAndConvertFile } from '../components/photolock/cognito/config';

const IMAGE_EXTENSIONS = [
  'apng',
  'avif',
  'gif',
  'jpg',
  'jpeg',
  'jfif',
  'pjpeg',
  'pjp',
  'png',
  'svg',
  'webp',
  'avi',
  'mov',
  'mp4'
] as const;

type ImageExtensions = (typeof IMAGE_EXTENSIONS)[number];

const MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  'mp4',
  'mov',
  'webm',
  'avi',
] as const;

type MediaExtensions = (typeof MEDIA_EXTENSIONS)[number];

function isValidImageExtension(
  extension: string
): extension is ImageExtensions {
  return IMAGE_EXTENSIONS.includes(
    extension.split('.').pop()?.toLowerCase() as ImageExtensions
  );
}

function determineExtension(fileName: string): 'png' | 'mp4' {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  
  // Check if the extension is in the list of video extensions to assign 'mp4', otherwise default to 'png'
  const videoExtensions = ['mp4', 'mov', 'webm', 'avi'];
  return videoExtensions.includes(extension) ? 'mp4' : 'png';
}

function isValidMediaExtension(
  extension: string
): extension is MediaExtensions {
  return MEDIA_EXTENSIONS.includes(
    extension.split('.').pop()?.toLowerCase() as MediaExtensions
  );
}

export function isValidImage(name: string, bytes: number): boolean {
  return isValidImageExtension(name) && bytes < 20 * Math.pow(1024, 2);
}

export function isValidMedia(name: string, size: number): boolean {
  return isValidMediaExtension(name) && size < 50 * Math.pow(1024, 2);
}

export function isValidUsername(
  username: string,
  value: string
): string | null {
  if (value.length < 4)
    return 'Your username must be longer than 4 characters.';
  if (value.length > 15)
    return 'Your username must be shorter than 15 characters.';
  if (!/^\w+$/i.test(value))
    return "Your username can only contain letters, numbers and '_'.";
  if (!/[a-z]/i.test(value)) return 'Include a non-number character.';
  if (value === username) return 'This is your current username.';

  return null;
}

type ImagesData = {
  imagesPreviewData: ImagesPreview;
  selectedImagesData: FilesWithId;
};

export async function getImagesData(
  files: FileList | null,
  currentFiles?: number
): Promise<ImagesData | null> {
  if (!files || !files.length) return null;

  const singleEditingMode = currentFiles === undefined;

  const rawMedia =
    singleEditingMode ||
    !(currentFiles === 4 || files.length > 4 - currentFiles)
      ? Array.from(files).filter(({ name, size }) => isValidMedia(name, size))
      : null;

  if (!rawMedia || !rawMedia.length) return null;

  const mediaId = rawMedia.map(({ name }) => {
    const randomId = getRandomId();
    const extension = determineExtension(name);
    return {
      id: randomId,
      name: `${randomId}.${extension}`
    };
  });

  ////////////////////////////////// ADDED //////////////////////////////////
  const validationPromises = rawMedia.map(async (media, index) => {
    let type: string;
    console.log("Media name: ", media.name);

    if (media.name.endsWith('.avi')) {  // if someone upload an AVI try to verify it, and then get MP4
      type = 'video/avi';

    } else if (media.name.endsWith('.png')) {
      type= 'image/png';
    
    } else {
      type = 'image/png'; // If the file is not AVI or PNG, the type will be 'unknown'
      console.log("not AVI or PNG will not be able to confirm validity");
    }
    // As File objects are already Blobs, you can directly pass them

    //##########################################################
    // ------------------ UPLOAD FROM FILESYSTEM ----------------
    //##########################################################
    console.log("Processing Upload from filesystem");
    const result = await processAndSendMedia(media, type);  // result of the API call to verify the image
    console.log("Is this a valid media from our first API call? : ", result.isValid);
    let isValid = result.isValid;

    if (type === 'video/avi' && isValid) {
      try {
          const convertedBlob = await uploadAndConvertFile(media); // This returns the converted MP4 blob
          // Use the converted MP4 blob directly
          media = convertedBlob; // Replace the original AVI blob with the converted MP4 blob
          // Update the name in the mediaId array to reflect the new MP4 file
          mediaId[index].name = `${mediaId[index].id}.mp4`;
      } catch (error) {
          console.error("Conversion failed:", error);
          isValid = false; // Consider conversion failure as invalid
      }
  }
  
  return {
      media,
      isValid,
      metadata: result.metadata ?? null,
  };
  });

   
  const validationResults = await Promise.all(validationPromises);

  const imagesPreviewData = validationResults.map(({ media, isValid, metadata }, index) => ({
    id: mediaId[index].id,
    src: URL.createObjectURL(media),
    alt: mediaId[index].name,
    isValid: isValid,
    metadata: metadata,
  }));

  const selectedImagesData = validationResults.map(({ media, isValid, metadata }, index) => {
    return renameFile(
      media,
      mediaId[index].id,
      mediaId[index].name,
      isValid,
      metadata
    );
  });

  return { imagesPreviewData, selectedImagesData };
}

function renameFile(
  file: File,
  newId: string,
  newName: string | null,
  isValid: boolean,
  metadata?: any // Make metadata optional in the function parameters
): FileWithId {
  const newFile = newName
    ? new File([file], newName, {
        type: file.type,
        lastModified: file.lastModified
      })
    : file;

  // Explicitly cast the object to the FileWithId type
  const fileWithId = Object.assign(newFile, { id: newId, isValid }) as FileWithId;

  // Conditionally add metadata only if it's present
  fileWithId.metadata = metadata ?? null;

  return fileWithId;
}
