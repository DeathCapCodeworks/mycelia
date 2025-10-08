// Main exports for @mycelia/applets-gallery
export * from './components';
export * from './hooks';

// Re-export main types and classes
export type {
  AppletManifest,
  AppletScope,
  AppletPermission,
  AppletInstallation,
  ConsentCardDiff,
  GalleryFilters
} from './index.tsx';

export {
  AppletsGalleryManager,
  AppletsGallery,
  getAppletsGalleryManager,
  appletsGallery
} from './index.tsx';
