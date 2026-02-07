import { ComicProject, ComicElement } from '../types';

// Helper: Convert Blob URL to Base64 string
const blobToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to convert blob to base64', blobUrl, error);
    return blobUrl; // Return original if failed
  }
};

// Main Save Function
export const saveProjectToFile = async (project: ComicProject) => {
  // 1. Create a deep copy to modify
  const projectToSave = JSON.parse(JSON.stringify(project)) as ComicProject;

  // 2. Iterate through all elements to find Blob URLs (user uploads)
  // We need to convert them to Base64 so they persist in the JSON file
  for (const page of projectToSave.pages) {
    for (const el of page.elements) {
      if (el.content && typeof el.content === 'string') {
        // Only convert blob URLs. 
        // External URLs (http) are left as is (unless we want to embed them too, but CORS might block it).
        // Data URLs are already embedded.
        if (el.content.startsWith('blob:')) {
          el.content = await blobToBase64(el.content);
        }
      }
    }
  }

  // 3. Create JSON Blob
  const dataStr = JSON.stringify(projectToSave, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // 4. Trigger Download
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `${safeTitle}_comic.json`;
  document.body.appendChild(link);
  link.click();
  
  // 5. Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Main Load Function
export const loadProjectFromFile = (file: File): Promise<ComicProject> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Failed to read file content');
        }

        const parsed = JSON.parse(result);

        // Basic validation of the project structure
        if (!parsed.id || !parsed.pages || !Array.isArray(parsed.pages)) {
          throw new Error('Invalid project file format: Missing required fields');
        }

        resolve(parsed as ComicProject);
      } catch (err) {
        console.error('Error parsing project file:', err);
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};