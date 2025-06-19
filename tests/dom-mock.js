// Enhanced DOM mock with more features
if (typeof document === "undefined") {
    class MockHTMLTemplateElement {
        constructor() {
            this.innerHTML = "";
            this.content = {
                cloneNode: () => this.cloneNode(),
            };
        }

        cloneNode() {
            const clone = new MockHTMLTemplateElement();
            clone.innerHTML = this.innerHTML;
            return clone;
        }
    }

    class MockElement {
        constructor(tagName) {
            this.tagName = tagName.toUpperCase();
            this.innerHTML = "";
            this.textContent = "";
            this.attributes = new Map();
            this.children = [];
        }

        setAttribute(name, value) {
            this.attributes.set(name, value);
        }

        getAttribute(name) {
            return this.attributes.get(name);
        }

        appendChild(child) {
            this.children.push(child);
            return child;
        }
    }

    global.HTMLTemplateElement = MockHTMLTemplateElement;
    global.HTMLElement = MockElement;

    global.document = {
        createElement: (tagName) => {
            if (tagName === "template") {
                return new MockHTMLTemplateElement();
            }
            return new MockElement(tagName);
        },

        createTextNode: (text) => ({
            textContent: text,
            nodeType: 3,
        }),

        body: new MockElement("body"),
    };

    // Mock window if needed
    global.window = global.window || {
        document: global.document,
    };
}
