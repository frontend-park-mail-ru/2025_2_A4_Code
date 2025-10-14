// Реализовать метод `.delay`
// ...
Function.prototype.delay = function(ms) {
    const originalFunction = this;
    return function(...args) {
        setTimeout(() => {
            originalFunction.apply(this, args);
        }, ms);
    };
};

function foo() {
    console.log("Wow!");
}

foo.delay(300)();
