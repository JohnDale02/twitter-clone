export type ImageData = {
  src: string;
  alt: string;
  isValid?: boolean;
  metadata?: {
    fingerprint?: string;
    camera_number?: string;
    location_data?: string;
    date_data?: string;
    time_data?: string;
    signature?: string;
  };
};

export type ImagesPreview = (ImageData & {
  id: string;
})[];

export type ImagePreview = ImageData & { id: string };

export type FileWithId = File & {
  id: string;
  isValid: boolean;
  metadata?: any; // The '?' makes the metadata optional
};


export type FilesWithId = (File & {
  id: string;
  isValid: boolean;
  metadata?: any; // The '?' makes the metadata optional
})[];
