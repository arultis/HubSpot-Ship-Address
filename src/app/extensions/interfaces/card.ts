import { AppHomeContext, CrmContext, GenericContext, ServerlessFuncRunner, SettingsContext } from "@hubspot/ui-extensions";

export interface CustomObject {
  id: string;
  name?: string;
  properties?: Record<string, any>;
}

export interface ExtensionProps {
  context: CrmContext | GenericContext | SettingsContext | AppHomeContext;
  runServerlessFunction: ServerlessFuncRunner;
}

export interface Response {
  response: any;
  status: number;
}
