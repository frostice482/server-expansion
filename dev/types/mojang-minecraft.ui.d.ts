// Type definitions for Minecraft Bedrock Edition script APIs (experimental) 0.1
// Project: https://docs.microsoft.com/minecraft/creator/
// Definitions by: Jake Shirley <https://github.com/JakeShirley>
//                 Mike Ammerlaan <https://github.com/mammerla>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

// Taken from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mojang-minecraft-ui/index.d.ts

/***************************************************************************************************************\
|                                                                                                               |
|    Copyright (c) Microsoft Corporation.                                                                       |
|                                                                                                               |
|    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and          |
|    associated documentation files (the "Software"), to deal in the Software without restriction,              |
|    including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,      |
|    and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,      |
|    subject to the following conditions:                                                                       |
|                                                                                                               |
|    The above copyright notice and this permission notice shall be included in all copies or substantial       |
|    portions of the Software.                                                                                  |
|                                                                                                               |
|    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT      |
|    LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.        |
|    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,    |
|    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE        |
|    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                     |
|                                                                                                               |
\***************************************************************************************************************/

declare module 'mojang-minecraft-ui' {
    import * as mojangminecraft from "mojang-minecraft";

    export class ActionFormData {
        body(bodyText: string): ActionFormData;
        button(text: string, iconPath?: string): ActionFormData;
        constructor();
        show(player: mojangminecraft.Player): Promise<ActionFormResponse>;
        title(titleText: string): ActionFormData;
    }

    export class FormResponse {
        readonly "isCanceled": boolean;
    }

    export class ActionFormResponse extends FormResponse {
        readonly "isCanceled": boolean;
        readonly "selection": number;
    }

    export class MessageFormData {
        body(bodyText: string): MessageFormData;
        button1(text: string): MessageFormData;
        button2(text: string): MessageFormData;
        constructor();
        show(player: mojangminecraft.Player): Promise<MessageFormResponse>;
        title(titleText: string): MessageFormData;
    }

    export class MessageFormResponse extends FormResponse {
        readonly "isCanceled": boolean;
        readonly "selection": number;
    }

    export class ModalFormData {
        constructor();
        dropdown(label: string, options: string[], defaultValueIndex?: number): ModalFormData;
        icon(iconPath: string): ModalFormData;
        show(player: mojangminecraft.Player): Promise<ModalFormResponse>;
        slider(label: string, minimumValue: number, maximumValue: number, valueStep: number, defaultValue?: number): ModalFormData;
        textField(label: string, placeholderText: string, defaultValue?: string): ModalFormData;
        title(titleText: string): ModalFormData;
        toggle(label: string, defaultValue?: boolean): ModalFormData;
    }

    export class ModalFormResponse extends FormResponse {
        readonly "formValues": any[];
        readonly "isCanceled": boolean;
    }
}
