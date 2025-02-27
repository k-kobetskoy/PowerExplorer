import { Injectable } from '@angular/core';
import { syntaxTree } from "@codemirror/language"
import { Extension } from '@codemirror/state';
import { linter, Diagnostic } from "@codemirror/lint"
import { XmlValidationService } from './xml-validation.service';
import { XmlParseService } from './xml-parse.service';

@Injectable({ providedIn: 'root' })

export class LinterProviderService {

  constructor(private tagsValidator: XmlValidationService, private xmlParser: XmlParseService) { }

  getLinter(): Extension {
    return linter(view => {

      let xmlValidationErrors: Diagnostic[] = [];
      let xmlParseErrors: Diagnostic[] = [];

      let tagsValidationStack: { mandatoryNodes: string[], from: number, to: number }[] = [];
      let sequenceValidationStack: string[] = [];

      syntaxTree(view.state).cursor().iterate(iteratingNode => {
        // Always validate the XML syntax
        this.tagsValidator.validateTagNode(iteratingNode, tagsValidationStack, xmlValidationErrors, sequenceValidationStack, view)

        // Only parse nodes if there are no validation errors
        if (xmlValidationErrors.length === 0) {
          this.xmlParser.parseNode(iteratingNode, view, xmlParseErrors)
        }
      });

      if (xmlValidationErrors.length > 0) {
        return xmlValidationErrors;
      }

      return xmlParseErrors;
    });
  }
}
