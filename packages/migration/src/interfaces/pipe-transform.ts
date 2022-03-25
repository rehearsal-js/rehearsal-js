import winston from 'winston';

export default interface PipeTransform {
  (params: { text: string; fileName: string; logger?: winston.Logger }): Promise<string>;
}
