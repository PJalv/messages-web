"use strict";

const { TimeoutError } = require("puppeteer");

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class MessageService {
    constructor(page) {
        this.page = page;
    }
    getInbox() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: add pagination
            yield this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            yield this.page.waitForSelector('body > mw-app > mw-bootstrap > div > main > mw-main-container > div > mw-main-nav > mws-conversations-list > nav > div.conv-container.ng-star-inserted > mws-conversation-list-item');
            const inbox = yield this.page.evaluate(() => {
                function evalConvoElement(conversation) {
                    const props = {
                        unread: false,
                        id: 0,
                        timestamp: '',
                        from: '',
                        latestMsgText: '' // querySelector('mws-conversation-snippet').innerText
                    };
                    props.unread = conversation.querySelector('.unread') ? true : false;
                    const regex = /conversations\/(\d{1,})/g;
                    const chatUrl = conversation.querySelector('a').href;
                    props.id = parseInt(chatUrl.match(regex)[0].split('conversations/')[1]);
                    if (conversation.querySelector('mws-relative-timestamp').childElementCount > 0) {
                        props.timestamp = conversation.querySelector('mws-relative-timestamp > .ng-star-inserted').getAttribute('aria-label');
                    }
                    else {
                        props.timestamp = conversation.querySelector('mws-relative-timestamp').innerText;
                    }
                    props.from = conversation.querySelector('h3').innerText;
                    props.latestMsgText = conversation.querySelector('mws-conversation-snippet').innerText;
                    if (props.latestMsgText.startsWith('You:')) {
                        props.latestMsgText = props.latestMsgText.slice('You:'.length).trim();
                    }
                    return props;
                }
                const conversations = document.querySelectorAll("body > mw-app > mw-bootstrap > div > main > mw-main-container > div > mw-main-nav > mws-conversations-list > nav > div.conv-container.ng-star-inserted > mws-conversation-list-item");
                const msgs = [];
                for (const conversation of conversations) {
                    if (conversation) {
                        msgs.push(evalConvoElement(conversation));
                    }
                }
                return msgs;
            });
            return inbox;
        });
    }
    preloadMessageChannel(to) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Preloading message channel with ${to.toString()}...`);
            yield this.page.waitForNavigation({ waitUntil: 'load' });
            yield this.page.waitForXPath('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-main-nav/mws-conversations-list', { timeout: 5000 });

            console.log('Found initial message list');
            try {
                const foundChannelHandle = yield this.page.waitForXPath(`//span[contains(., '${to.toString()}')]`, { timeout: 5000 });
                console.log(`Found previous conversation with ${to.toString()}`);
                const element = yield foundChannelHandle.evaluateHandle((node) => node);
                yield element.click();
                yield this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            } catch (e) {
                console.log(`No previous conversation found with ${to.toString()}... creating a new chat`);
                const newChatBtn = yield this.page.$('body > mw-app > mw-bootstrap > div > main > mw-main-container > div > mw-main-nav > div > mw-fab-link > a');
                console.log('Found New Chat Button!');
                yield newChatBtn.click();
                console.log('New chat clicked!');

                yield this.page.waitForXPath('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-new-conversation-container/mw-new-conversation-sub-header/div/div[2]/mw-contact-chips-input/div/div/input', { timeout: 5000 });
                console.log('Found number input');

                let numberInput = yield this.page.$x('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-new-conversation-container/mw-new-conversation-sub-header/div/div[2]/mw-contact-chips-input/div/div/input', { timeout: 5000 });
                console.log('Number input hooked');
                yield numberInput[0].click();
                if (numberInput.length) {
                    console.log('Typing number...');
                    yield numberInput[0].type(to);
                    console.log('Typed number');
                    const numberClick = yield this.page.$("body > mw-app > mw-bootstrap > div > main > mw-main-container > div > mw-new-conversation-container > div > mw-contact-selector-button > button");
                    yield numberClick.click();
                    console.log('Number submitted');
                    console.log('Looking for message input...');
                    yield this.page.waitForXPath('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-conversation-container/div/div[1]/div/mws-message-compose/div/div[2]/div/div/mws-autosize-textarea/textarea', { timeout: 10000 });
                    console.log("Message input hooked!")
                }
            }
        });
    }
    sendMessage(text) {
        return __awaiter(this, void 0, void 0, function* () {
            let msgInput = yield this.page.$x('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-conversation-container/div/div[1]/div/mws-message-compose/div/div[2]/div/div/mws-autosize-textarea/textarea');
            console.log('Message input hooked');

            if (msgInput.length) {
                console.log('Typing message...');
                yield msgInput[0].type(text);
                yield this.page.keyboard.press('Enter');
                console.log('Message sent');
            } else {
                console.warn('Message input not found');
                yield this.page.reload();
                console.warn('Retrying...');
                yield this.sendMessage(text);
            }

            // TODO: return messageId
            return;
        });
    }
    sendMessageFull(to, text) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.waitForNavigation({ waitUntil: 'load' });
            yield this.page.waitForXPath('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-main-nav/mws-conversations-list', { timeout: 5000 });

            console.log('Found initial message list');
            try {

                const foundChannelHandle = yield this.page.waitForXPath(`//span[contains(., '${to.toString()}')]`, { timeout: 2222 });

                console.log(results.time);  // in milliseconds
                console.log(`Found previous with ${to.toString()}`)
                const element = yield foundChannelHandle.evaluateHandle((node) => node);
                yield element.click();
                yield this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            } catch (e) {

                console.log(results.time);  // in milliseconds
                console.log("No previous convo found... creating new chat")
                const newChatBtn = yield this.page.$('body > mw-app > mw-bootstrap > div > main > mw-main-container > div > mw-main-nav > div > mw-fab-link > a');
                console.log('Found New Chat Button!');
                yield newChatBtn.click();
                console.log('New chat clicked!');

                yield this.page.waitForXPath('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-new-conversation-container/mw-new-conversation-sub-header/div/div[2]/mw-contact-chips-input/div/mat-chip-listbox/div/input', { timeout: 5000 });
                console.log('Found number input');

                let numberInput = yield this.page.$x('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-new-conversation-container/mw-new-conversation-sub-header/div/div[2]/mw-contact-chips-input/div/mat-chip-listbox/div/input', { timeout: 5000 });
                console.log('Number input hooked');
                yield numberInput[0].click();
                if (numberInput.length) {
                    console.log('Typing number...');
                    yield numberInput[0].type(to);
                    console.log('Typed number');
                    const numberClick = yield this.page.$("body > mw-app > mw-bootstrap > div > main > mw-main-container > div > mw-new-conversation-container > div > mw-contact-selector-button > button > span.mat-mdc-button-persistent-ripple.mdc-button__ripple")
                    yield numberClick.click()



                    // yield this.page.keyboard.press('Enter');
                    console.log('Number submitted');
                }
            }

            yield this.page.waitForXPath('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-conversation-container/div/div[1]/div/mws-message-compose/div/div[2]/div/div/mws-autosize-textarea/textarea', { timeout: 10000 });
            console.log('Looking for message input...');

            let msgInput = yield this.page.$x('/html/body/mw-app/mw-bootstrap/div/main/mw-main-container/div/mw-conversation-container/div/div[1]/div/mws-message-compose/div/div[2]/div/div/mws-autosize-textarea/textarea');
            console.log('Message input hooked');

            if (msgInput.length) {
                console.log('Typing message...');
                yield msgInput[0].type(text);
                yield this.page.keyboard.press('Enter');
                console.log('Message sent');
            } else {
                console.warn('Message input not found');
                yield this.page.reload();
                console.warn('Retrying...');
                yield this.sendMessage(to, text);
            }

            // TODO: return messageId
            return;
        });
    }

}

exports.default = MessageService;
