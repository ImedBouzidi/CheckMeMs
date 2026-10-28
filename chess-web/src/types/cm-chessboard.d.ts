declare module 'cm-chessboard' {
  export const COLOR: {
    white: 'w';
    black: 'b';
  };
  export const INPUT_EVENT_TYPE: {
    moveInputStarted: string;
    movingOverSquare: string;
    validateMoveInput: string;
    moveInputFinished: string;
    moveInputCanceled: string;
  };
  export const BORDER_TYPE: {
    none: string;
    thin: string;
    frame: string;
  };
  export const PIECE: Record<string, string>;
  export const PIECE_TYPE: Record<string, string>;
  export const PIECES_FILE_TYPE: {
    svgSprite: string;
  };
  export const FEN: {
    empty: string;
    start: string;
  };
  export class Chessboard {
    context: HTMLElement;
    constructor(element: HTMLElement, config?: any);
    enableMoveInput(callback: (event: any) => boolean | void, color?: string): void;
    disableMoveInput(): void;
    setPosition(fen: string, animated?: boolean): Promise<void>;
    getPosition(): string;
    setOrientation(color: string): Promise<void>;
    getOrientation(): string;
    getPiece(square: string): string | undefined;
    destroy(): void;
    addMarker?(type: any, square: string): void;
    removeMarkers?(type?: any, square?: string): void;
    getMarkers?(type?: any, square?: string): any[];
    addLegalMovesMarkers?(moves: any[]): void;
    removeLegalMovesMarkers?(): void;
    addArrow?(type: any, from: string, to: string): void;
    removeArrows?(type?: any, from?: string, to?: string): void;
    getArrows?(type?: any, from?: string, to?: string): any[];
    showPromotionDialog?(square: string, color: string, callback: (result: any) => void): void;
    isPromotionDialogShown?(): boolean;
  }
}

declare module 'cm-chessboard/src/extensions/markers/Markers.js' {
  export const MARKER_TYPE: {
    frame: any;
    framePrimary: any;
    frameDanger: any;
    circle: any;
    circlePrimary: any;
    circleDanger: any;
    circleDangerFilled: any;
    square: any;
    dot: any;
    bevel: any;
  };
  export class Markers {
    constructor(chessboard: any, props?: any);
  }
}

declare module 'cm-chessboard/src/extensions/arrows/Arrows.js' {
  export const ARROW_TYPE: {
    default: any;
    success: any;
    secondary: any;
    warning: any;
    info: any;
    danger: any;
  };
  export class Arrows {
    constructor(chessboard: any, props?: any);
  }
}

declare module 'cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js' {
  export const PROMOTION_DIALOG_RESULT_TYPE: {
    pieceSelected: string;
    canceled: string;
  };
  export class PromotionDialog {
    constructor(chessboard: any, props?: any);
  }
}
