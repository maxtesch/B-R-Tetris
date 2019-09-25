define(['brease/core/Decorator', 'brease/events/BreaseEvent', 'brease/enum/Enum'], function (Decorator, BreaseEvent, Enum) {

    'use strict';

    var CultureDependency = function () {
            this.initType = Decorator.TYPE_PRE;
        },
        dependency = 'culture',
        changeHandler = 'cultureChangeHandler';

    CultureDependency.prototype = new Decorator();
    CultureDependency.prototype.constructor = CultureDependency;

    var instance = new CultureDependency();

    instance.methodsToAdd = {

        init: function (initialDependency) {
            if (this[changeHandler] === undefined) {
                throw new Error('widget \u00BB' + this.elem.id + '\u00AB: decoration with "' + instance.constructor.name + '" requires method "' + changeHandler + '"');
            }

            this.dependencies[dependency] = {
                state: Enum.Dependency.INACTIVE,
                suspend: suspend.bind(this),
                wake: wake.bind(this)
            };
            if (initialDependency === true) {
                this.setCultureDependency(initialDependency);
            }
        },

        setCultureDependency: function (flag) {
            if (flag === true) {
                setState.call(this, Enum.Dependency.ACTIVE);
            } else {
                setState.call(this, Enum.Dependency.INACTIVE);
            }
        },

        dispose: function () {
            this.dependencies[dependency] = null;
            removeListener.call(this);
        }

    };

    function suspend() {
        if (this.dependencies[dependency].state === Enum.Dependency.ACTIVE) {
            this.dependencies[dependency].stored = brease.culture.getCurrentCulture().key;
            setState.call(this, Enum.Dependency.SUSPENDED);
        }
    }

    function wake(e) {
        if (this.dependencies[dependency].state === Enum.Dependency.SUSPENDED) {
            setState.call(this, Enum.Dependency.ACTIVE);
            if (this.dependencies[dependency].stored !== brease.culture.getCurrentCulture().key) {
                this[changeHandler](e);
            }
        }
    }

    function setState(state) {
        //console.log('%c' + this.elem.id + '.dependencies[' + dependency + '].state=' + state, 'color:#cccc00');
        this.dependencies[dependency].state = state;
        if (state === Enum.Dependency.ACTIVE) {
            addListener.call(this);
        } else {
            removeListener.call(this);
        }
    }

    function addListener() {
        document.body.addEventListener(BreaseEvent.CULTURE_CHANGED, this._bind(changeHandler));
    }

    function removeListener() {
        document.body.removeEventListener(BreaseEvent.CULTURE_CHANGED, this._bind(changeHandler));
    }

    return instance;
});
