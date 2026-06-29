import { Component, forwardRef, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-rich-text-editor',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="rich-editor-wrapper">
            <input type="file" #imageInput accept="image/*" style="display: none" (change)="onImageSelected($event)" />
            
            <div class="rich-toolbar">
                <!-- Voice Input Button -->
                <button type="button" (click)="toggleVoiceInput()" 
                        [class.voice-active]="isListening" 
                        title="Voice Input (Speak to type)">
                    🎤 {{isListening ? 'Stop' : 'Speak'}}
                </button>
                
                <span class="sep"></span>
                
                <!-- Rest of your toolbar buttons -->
                <button type="button" (click)="exec('bold')" title="Bold"><b>B</b></button>
                <button type="button" (click)="exec('italic')" title="Italic"><i>I</i></button>
                <button type="button" (click)="exec('underline')" title="Underline"><u>U</u></button>
                <button type="button" (click)="exec('strikeThrough')" title="Strikethrough"><s>S</s></button>
                
                <span class="sep"></span>
                
                <input type="color" (change)="exec('foreColor', $event)" title="Text Color" class="color-picker" value="#000000">
                <input type="color" (change)="exec('hiliteColor', $event)" title="Background Color" class="color-picker" value="#ffff00">
                
                <span class="sep"></span>
                
                <select (change)="exec('formatBlock', $event)" class="select-tool">
                    <option value="p">Normal</option>
                    <option value="<H1>">Heading 1</option>
                    <option value="<H2>">Heading 2</option>
                    <option value="<H3>">Heading 3</option>
                    <option value="<H4>">Heading 4</option>
                </select>
                
                <select (change)="exec('fontSize', $event)" class="select-tool">
                    <option value="1">Small</option>
                    <option value="3" selected>Normal</option>
                    <option value="5">Large</option>
                    <option value="6">Huge</option>
                </select>
                
                <span class="sep"></span>
                
                <button type="button" (click)="exec('insertOrderedList')" title="Numbered List">1.</button>
                <button type="button" (click)="exec('insertUnorderedList')" title="Bullet List">•</button>
                
                <span class="sep"></span>
                
                <button type="button" (click)="exec('justifyLeft')" title="Align Left">⬅</button>
                <button type="button" (click)="exec('justifyCenter')" title="Center">⬌</button>
                <button type="button" (click)="exec('justifyRight')" title="Align Right">➡</button>
                
                <span class="sep"></span>
                
                <button type="button" (click)="exec('outdent')" title="Outdent">← Outdent</button>
                <button type="button" (click)="exec('indent')" title="Indent">Indent →</button>
                
                <span class="sep"></span>
                
                <button type="button" (click)="insertLink()" title="Insert Link">🔗 Link</button>
                <button type="button" (click)="openImageFilePicker()" title="Insert Image">🖼️ Image</button>
                
                <span class="sep"></span>
                
                <button type="button" (click)="insertTable()" title="Insert Table">📊 Table</button>
                
                <span class="sep"></span>
                
                <button type="button" (click)="exec('undo')" title="Undo">↩️ Undo</button>
                <button type="button" (click)="exec('redo')" title="Redo">↪️ Redo</button>
                
                <span class="sep"></span>
                
                <button type="button" (click)="clearContent()" title="Clear All Content">🗑️ Clear All</button>
                <button type="button" (click)="exec('removeFormat')" title="Remove Formatting">✖ Clear Format</button>
            </div>
            
            <div *ngIf="isListening" class="voice-status">
                <span class="voice-pulse"></span>
                Listening... Speak now
                <span class="voice-hint">{{voiceTranscript || ''}}</span>
            </div>
            
            <div #editor class="rich-content" contenteditable="true" (input)="onInput()"></div>
        </div>
    `,
    styles: [`
        .rich-editor-wrapper {
            border: 1px solid #e8dfc8;
            border-radius: 4px;
            background: white;
            width: 100%;
        }
        .rich-toolbar {
            padding: 8px;
            border-bottom: 1px solid #e8dfc8;
            background: #f9f4e8;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            border-radius: 4px 4px 0 0;
        }
        .rich-toolbar button,
        .select-tool {
            padding: 5px 10px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 3px;
            font-size: 13px;
        }
        .rich-toolbar button:hover {
            background: #8b2020;
            color: white;
        }
        .rich-toolbar button.voice-active {
            background: #4caf50;
            color: white;
            border-color: #4caf50;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
        .color-picker {
            width: 30px;
            height: 30px;
            padding: 2px;
            border: 1px solid #ddd;
            border-radius: 3px;
            cursor: pointer;
        }
        .sep {
            width: 1px;
            background: #e8dfc8;
            margin: 0 5px;
        }
        .rich-content {
            min-height: 250px;
            padding: 10px;
            outline: none;
            font-size: 14px;
            line-height: 1.5;
        }
        .rich-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 10px 0;
        }
        .rich-content table td,
        .rich-content table th {
            border: 1px solid #ccc;
            padding: 8px;
        }
        .rich-content table th {
            background: #f9f4e8;
        }
        .rich-content ul, .rich-content ol {
            padding-left: 20px;
        }
        .rich-content img {
            max-width: 100%;
            height: auto;
        }
        .voice-status {
            padding: 8px 12px;
            background: #e8f5e9;
            border-bottom: 1px solid #c8e6c9;
            font-size: 12px;
            color: #2e7d32;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .voice-pulse {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4caf50;
            animation: pulse 1s infinite;
        }
        .voice-hint {
            font-style: italic;
            color: #666;
            margin-left: auto;
        }
    `],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => RichTextEditorComponent),
            multi: true
        }
    ]
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
    @ViewChild('editor') editor!: ElementRef;
    @ViewChild('imageInput') imageInput!: ElementRef;

    private value: string = '';
    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    private recognition: any = null;
    isListening: boolean = false;
    voiceTranscript: string = '';

    constructor(private cdr: ChangeDetectorRef) { }

    ngAfterViewInit() {
        if (this.value && this.editor) {
            this.editor.nativeElement.innerHTML = this.value;
        }
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                this.voiceTranscript = interimTranscript || (finalTranscript ? '✓ ' + finalTranscript : '');
                this.cdr.detectChanges();

                if (finalTranscript) {
                    this.insertTextAtCursor(finalTranscript + ' ');
                }
            };

            this.recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.voiceTranscript = '';
                this.cdr.detectChanges();
                if (event.error === 'not-allowed') {
                    alert('Please allow microphone access to use voice input.');
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.voiceTranscript = '';
                this.cdr.detectChanges();
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
            // Optional: Add a message in the toolbar
        }
    }

    toggleVoiceInput() {
        if (!this.recognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
                this.isListening = true;
                this.voiceTranscript = 'Listening...';
                this.cdr.detectChanges();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                alert('Could not start voice input. Please try again.');
            }
        }
    }

    insertTextAtCursor(text: string) {
        const editorElement = this.editor.nativeElement;
        editorElement.focus();

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            const currentHtml = editorElement.innerHTML;
            editorElement.innerHTML = currentHtml + text;
        }

        this.onInput();
    }

    exec(command: string, event?: any) {
        if (event && (command === 'foreColor' || command === 'hiliteColor')) {
            document.execCommand(command, false, event.target.value);
        } else if (event && command === 'formatBlock') {
            document.execCommand(command, false, event.target.value);
        } else if (event && command === 'fontSize') {
            document.execCommand(command, false, event.target.value);
        } else {
            document.execCommand(command, false, '');
        }
        this.onInput();
        this.editor.nativeElement.focus();
    }

    clearContent() {
        if (confirm('Are you sure you want to clear all content?')) {
            this.editor.nativeElement.innerHTML = '';
            this.onInput();
            this.editor.nativeElement.focus();
        }
    }

    insertLink() {
        const url = prompt('Enter URL:', 'https://');
        if (url) {
            document.execCommand('createLink', false, url);
            this.onInput();
        }
    }

    openImageFilePicker() {
        this.imageInput.nativeElement.click();
    }

    onImageSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                document.execCommand('insertImage', false, e.target.result);
                this.onInput();
            };
            reader.readAsDataURL(file);
        }
        this.imageInput.nativeElement.value = '';
    }

    insertTable() {
        const rows = prompt('Enter number of rows:', '3') || '3';
        const cols = prompt('Enter number of columns:', '3') || '3';
        const numRows = parseInt(rows);
        const numCols = parseInt(cols);

        if (isNaN(numRows) || isNaN(numCols) || numRows < 1 || numCols < 1) {
            alert('Please enter valid numbers');
            return;
        }

        let tableHtml = `<table border="1" style="border-collapse: collapse; width: 100%;">`;
        tableHtml += `<thead><tr>`;
        for (let i = 1; i <= numCols; i++) {
            tableHtml += `<th style="border: 1px solid #ccc; padding: 8px; background: #f9f4e8;">Header ${i}</th>`;
        }
        tableHtml += `</tr></thead><tbody>`;

        for (let i = 1; i <= numRows; i++) {
            tableHtml += `<tr>`;
            for (let j = 1; j <= numCols; j++) {
                tableHtml += `<td style="border: 1px solid #ccc; padding: 8px;">&nbsp;<\/td>`;
            }
            tableHtml += `</tr>`;
        }

        tableHtml += `</tbody></table><br/>`;

        document.execCommand('insertHTML', false, tableHtml);
        this.onInput();
        this.editor.nativeElement.focus();
    }

    onInput() {
        this.value = this.editor.nativeElement.innerHTML;
        this.onChange(this.value);
    }

    writeValue(value: string): void {
        this.value = value || '';
        if (this.editor) {
            this.editor.nativeElement.innerHTML = this.value;
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }
}