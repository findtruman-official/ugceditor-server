import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class IpfsService {
  private readonly _logger = new Logger(IpfsService.name);

  private _host = 'http://127.0.0.1:5001';

  constructor(private readonly http: HttpService) {}

  async storeFile(content: Buffer): Promise<IpfsAddResult> {
    const formData = new FormData();
    formData.append('file', content);
    const result = await firstValueFrom(
      this.http.post(this._host + '/api/v0/add', formData),
    );
    return {
      cid: result.data.Hash,
      size: parseInt(result.data.Size),
    };
  }

  async storeJson(dat: any): Promise<IpfsAddResult> {
    const formData = new FormData();
    formData.append('file', JSON.stringify(dat));
    const result = await firstValueFrom(
      this.http.post(this._host + '/api/v0/add', formData),
    );

    // {
    //   "Name": "QmbJWAESqCsf4RFCqEY7jecCashj8usXiyDNfKtZCwwzGb",
    //   "Hash": "QmbJWAESqCsf4RFCqEY7jecCashj8usXiyDNfKtZCwwzGb",
    //   "Size": "10"
    // }
    return {
      cid: result.data.Hash,
      size: parseInt(result.data.Size),
    };
  }

  async loadJson(
    cid: string,
    config?: Parameters<HttpService['post']>[2],
  ): Promise<any> {
    this._logger.debug(`load json ${cid}`);
    const result = await firstValueFrom(
      this.http.post(this._host + `/api/v0/cat?arg=${cid}`, undefined, config),
    );
    return result.data;
  }

  async loadFile(cid: string): Promise<string> {
    this._logger.debug(`load json ${cid}`);
    const result = await firstValueFrom(
      this.http.post(this._host + `/api/v0/cat?arg=${cid}`, undefined, {
        responseType: 'arraybuffer',
      }),
    );
    return result.data;
  }

  async uploadMultiJson(
    dat: { filename: string; json: any }[],
  ): Promise<IpfsAddResult> {
    const formData = new FormData();

    for (const { filename, json } of dat) {
      formData.append(filename, JSON.stringify(json), {
        filename,
      });
    }

    const result = await firstValueFrom(
      this.http.post(
        this._host + '/api/v0/add?wrap-with-directory=true',
        formData,
      ),
    );
    const lines = result.data.split('\n').filter((v) => v);

    const dirDat = JSON.parse(lines[lines.length - 1]);
    return {
      cid: dirDat.Hash,
      size: parseInt(dirDat.Size),
    };
  }
}
