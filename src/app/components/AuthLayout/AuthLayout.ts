import template from "./AuthLayout.hbs";
import "./AuthLayout.scss";
import {Layout} from "@shared/base/Layout";

export class AuthLayout extends Layout {
    protected renderTemplate(): string {
        return template({});
    }
}

