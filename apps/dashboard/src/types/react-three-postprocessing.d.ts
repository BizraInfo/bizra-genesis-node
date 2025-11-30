// Type shim for @react-three/postprocessing
// Resolves TypeScript errors: "Type 'undefined' is not assignable to type 'Element'"
//
// This shim provides minimal, permissive types for the postprocessing components
// used in Environment.tsx. When official types become available, this can be removed.

declare module '@react-three/postprocessing' {
  import { ReactElement, ReactNode } from 'react';

  // Base props interface for postprocessing components
  interface PostProcessingProps {
    children?: ReactNode;
    enabled?: boolean;
  }

  // Core EffectComposer
  export const EffectComposer: (props: PostProcessingProps) => ReactElement | null;

  // Bloom effect
  export interface BloomProps extends PostProcessingProps {
    intensity?: number;
    kernelSize?: number;
    luminanceThreshold?: number;
    luminanceSmoothing?: number;
  }
  export const Bloom: (props: BloomProps) => ReactElement | null;

  // Vignette effect
  export interface VignetteProps extends PostProcessingProps {
    offset?: number;
    darkness?: number;
    eskil?: boolean;
  }
  export const Vignette: (props: VignetteProps) => ReactElement | null;

  // Noise effect
  export interface NoiseProps extends PostProcessingProps {
    premultiply?: boolean;
    blendFunction?: any;
  }
  export const Noise: (props: NoiseProps) => ReactElement | null;

  // Generic pass for other effects
  export interface PassProps extends PostProcessingProps {
    args?: any[];
    [key: string]: any;
  }

  // Allow any other postprocessing components to be imported
  export const ChromaticAberration: (props: PassProps) => ReactElement | null;
  export const DepthOfField: (props: PassProps) => ReactElement | null;
  export const SMAA: (props: PassProps) => ReactElement | null;

  // SelectiveBloom for advanced bloom control
  export const SelectiveBloom: (props: PostProcessingProps & {
    lights?: any[];
    selection?: any[];
    selectionLayer?: number;
  }) => ReactElement | null;

  // ToneMapping
  export const ToneMapping: (props: PostProcessingProps & {
    adaptive?: boolean;
    resolution?: number;
    middleGrey?: number;
    maxLuminance?: number;
    averageLuminance?: number;
    adaptationRate?: number;
  }) => ReactElement | null;
}
