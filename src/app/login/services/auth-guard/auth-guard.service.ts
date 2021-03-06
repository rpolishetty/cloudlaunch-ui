import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
    ActivatedRouteSnapshot,
    RouterStateSnapshot
} from '@angular/router';

import { LoginService } from '../login/login.service';


@Injectable()
export class AuthGuardService implements CanActivate {
    constructor(private _loginService: LoginService, private router: Router) { }

    canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        let loginPromise: any = this._loginService.isLoggedIn().then((loggedIn) => {
            if (loggedIn) {
                return true;
            }
            else {
                this.router.navigate(['/auth/login']);
            }
        });
        return loginPromise;
    }
}
