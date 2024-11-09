import { Injectable } from '@angular/core';
import { syntaxTree } from "@codemirror/language"
import { Extension } from '@codemirror/state';
import { linter, Diagnostic } from "@codemirror/lint"
import { BasicXmlValidationService } from './basic-xml-validation.service';
import { XmlParseService } from './xml-parse.service';

@Injectable({ providedIn: 'root' })

export class LinterProviderService {

  constructor(private tagsValidator: BasicXmlValidationService, private xmlParser: XmlParseService) { }

  getLinter(): Extension {
    return linter(view => {

      let basicXmlValidationErrors: Diagnostic[] = [];
      let xmlParseErrors: Diagnostic[] = [];

      let tagsValidationStack: { mandatoryNodes: string[], from: number, to: number }[] = [];
      let sequenceValidationStack: string[] = [];

      syntaxTree(view.state).cursor().iterate(iteratingNode => {
        this.tagsValidator.validateTagNode(iteratingNode, tagsValidationStack, basicXmlValidationErrors, sequenceValidationStack, view)

        if (basicXmlValidationErrors.length === 0) {
          this.xmlParser.parseNode(iteratingNode, view, xmlParseErrors)
        }
      });

      if (basicXmlValidationErrors.length > 0) {
        return basicXmlValidationErrors;
      }

      return xmlParseErrors;
    });
  }
}
