import imageCompression from 'browser-image-compression';

export const compressImage = async (imageFile: File): Promise<File> => {
    console.log(`Tamano original de la imagen: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);

    const options = {
        maxSizeMB: 0.3, // Comprimir para que no exceda 300KB
        maxWidthOrHeight: 1200, // Redimensionar respetando ratio
        useWebWorker: true, // No congelar la UI mientras comprime
    };

    try {
        const compressedFile = await imageCompression(imageFile, options);
        console.log(`Tamano comprimido de la imagen: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        return compressedFile;
    } catch (error) {
        console.error("Error comprimiendo imagen:", error);
        return imageFile; // En caso de falla grave, devolver la original (no ideal, pero más seguro)
    }
};
