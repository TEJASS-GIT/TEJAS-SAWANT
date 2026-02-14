
export interface Keyframe {
  handshape: string; // The letter/shape proxy (e.g., 'B', 'A', '5', 'S')
  x: number; // -100 to 100
  y: number; // -100 to 100
  rotation: number; // in degrees
  duration: number; // in ms
}

export interface DualHandFrames {
  leftHand: Keyframe[];
  rightHand: Keyframe[];
}

export interface SignGloss {
  word: string;
  gloss: string;
  explanation: string;
  handshapeDescription: string;
  isTwoHanded: boolean;
  animation: DualHandFrames;
}

export interface TranslationResult {
  originalText: string;
  translatedEnglish?: string; // New: To show the bridge translation from Devanagari
  glosses: SignGloss[];
  aslStructure: string;
}
