import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { TextEncodingService } from '../services/text-encoding.service';

@Injectable({
  providedIn: 'root'
})
export class TextEncodingInterceptorService implements HttpInterceptor {

  constructor(private textEncodingService: TextEncodingService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      map(event => {
        if (event instanceof HttpResponse && this.isTextResponse(event)) {
          // Process text content to fix encoding issues
          const processedBody = this.processTextContent(event.body);
          return event.clone({ body: processedBody });
        }
        return event;
      })
    );
  }

  private isTextResponse(response: HttpResponse<any>): boolean {
    const contentType = response.headers.get('content-type');
    return contentType && (
      contentType.includes('application/json') ||
      contentType.includes('text/') ||
      contentType.includes('application/javascript')
    );
  }

  private processTextContent(body: any): any {
    if (!body) return body;

    try {
      // Handle different response structures
      if (typeof body === 'string') {
        return this.textEncodingService.normalizeTextForDisplay(body);
      }

      if (Array.isArray(body)) {
        return body.map(item => this.processTextContent(item));
      }

      if (typeof body === 'object') {
        const processedBody = { ...body };
        
        // Process common text fields
        const textFields = ['content', 'title', 'text', 'description', 'name'];
        textFields.forEach(field => {
          if (processedBody[field] && typeof processedBody[field] === 'string') {
            processedBody[field] = this.textEncodingService.normalizeTextForDisplay(processedBody[field]);
          }
        });

        // Process arrays of text (like sentences)
        if (processedBody.content && Array.isArray(processedBody.content)) {
          processedBody.content = processedBody.content.map((sentence: string) => 
            this.textEncodingService.normalizeTextForDisplay(sentence)
          );
        }

        // Recursively process nested objects
        Object.keys(processedBody).forEach(key => {
          if (typeof processedBody[key] === 'object' && processedBody[key] !== null) {
            processedBody[key] = this.processTextContent(processedBody[key]);
          }
        });

        return processedBody;
      }

      return body;
    } catch (error) {
      console.warn('Error processing text content:', error);
      return body;
    }
  }
}

