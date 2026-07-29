declare module 'react-player' {
  import { Component } from 'react';

  interface ReactPlayerProps {
    url: string;
    playing?: boolean;
    controls?: boolean;
    volume?: number;
    muted?: boolean;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    config?: {
      facebook?: {
        appId?: string;
        version?: string;
        playerId?: string;
        attributes?: Record<string, string>;
      };
      [key: string]: any;
    };
    onReady?: () => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: any) => void;
    onProgress?: (state: { played: number; loaded: number }) => void;
    onDuration?: (duration: number) => void;
    [key: string]: any;
  }

  export default class ReactPlayer extends Component<ReactPlayerProps> {}
}
