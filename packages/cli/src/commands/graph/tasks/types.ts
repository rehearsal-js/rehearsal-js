export interface GraphWorkerOptions {
  rootPath: string;
  srcPath: string;
  ignore: string[];
  serviceMap: Record<string, string>;
  output?: string;
  externals?: boolean;
}

type MessageResponse = { type: 'message'; content: string };
type FilesResponse = { type: 'files'; content: string[] };
export type Response = MessageResponse | FilesResponse;
