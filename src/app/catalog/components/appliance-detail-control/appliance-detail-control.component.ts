import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';

import { CLAuthHttp } from '../../../login/utils/cloudlaunch-http';
import { AppPlaceHolderComponent } from './app-placeholder.component';

// Models
import { Application, ApplicationVersion, ApplicationVersionCloudConfig } from '../../../shared/models/application';
import { Cloud } from '../../../shared/models/cloud';
import { Deployment } from '../../../shared/models/deployment';
import { Credentials } from '../../../shared/models/profile';

//Services
import { ApplicationService } from '../../../shared/services/application.service';
import { DeploymentService } from '../../../shared/services/deployment.service';
import { LoginService } from '../../../login/services/login/login.service';


@Component({
    selector: 'app-appliance-detail-control',
    templateUrl: './appliance-detail-control.component.html',
    styleUrls: ['./appliance-detail-control.component.css']
})
export class ApplianceDetailControlComponent implements OnInit {

    @Input()
    set application(value: Application) {
        this.appControl.patchValue(value);
    }

    get application() : Application {
        return this.appControl.value;
    }

    // Form controls
    applianceLaunchForm: FormGroup;
    appConfigForm: FormGroup;
    nameControl = new FormControl('', Validators.required);
    appControl = new FormControl('', Validators.required);
    appVerControl = new FormControl('', Validators.required);
    credentialsControl = new FormControl('', Validators.required);
    targetCloudControl = new FormControl('', Validators.required);

    public errorMessage: string;
    private submitPending: boolean = false;

    constructor(
        fb: FormBuilder,
        private _router: Router,
        private _applicationService: ApplicationService,
        private _deploymentService: DeploymentService,
        private _loginService: LoginService,
        private _http: CLAuthHttp
        ) {
        this.appConfigForm = fb.group({});
        this.applianceLaunchForm = fb.group({
            'name': this.nameControl,
            'application': this.appControl,
            'application_version': this.appVerControl,
            'target_cloud': this.targetCloudControl,
            'credentials': this.credentialsControl,
            'config_app': this.appConfigForm
        });
        this.appControl.valueChanges.subscribe(app => { this.onApplicationChange(app); });
        this.appVerControl.valueChanges.subscribe(appVer => { this.onVersionChange(appVer); });
        this.targetCloudControl.valueChanges.subscribe(cloud => { this.onTargetCloudChange(cloud); });
        this.credentialsControl.valueChanges.subscribe(creds => { this.setRequestCredentials(creds); });
    }

    ngOnInit() {
        // Generate a default name for the deployment
        const deployment_name = (this._loginService.getCurrentUser().username + '-' +
                                 this.application.slug + '-' + new Date().toJSON()
                                 .slice(2, 16).replace(':', '-')).toLowerCase();
        this.nameControl.setValue(deployment_name);
    }

    /*
     * The fields have dependencies in the following order:
     * Application -> Version -> Cloud -> Credentials
     */
    onApplicationChange(app: Application) {
        this.onVersionSelectById(app ? app.default_version : null);
    }

    onVersionSelectById(version_id: string) {
        if (version_id) {
            let applicationVersion = this.application.versions.filter(v => { return v.version == version_id; })[0];
            this.appVerControl.setValue(applicationVersion);
        }
        else
            this.appVerControl.patchValue(null);
    }

    onVersionChange(version: ApplicationVersion) {
        if (version.default_cloud) {
            let default_cloud = this.getVersionConfigForCloud(version.default_cloud).cloud;
            this.targetCloudControl.setValue(default_cloud);
        }
        else
            this.targetCloudControl.patchValue(null);
    }

    onTargetCloudChange(cloud: Cloud) {
        this.credentialsControl.patchValue(null);
    }

    getCurrentAppCloudConfig() : ApplicationVersionCloudConfig {
        let cloud = this.targetCloudControl.value;
        if (cloud)
            return this.getVersionConfigForCloud(cloud.slug);
        else
            return null;
    }

    getVersionConfigForCloud(slug: string) : ApplicationVersionCloudConfig {
        return this.appVerControl.value.cloud_config.filter(v => { return v.cloud.slug === slug; })[0];
    }

    getCloudsForSelectedVersion(): Cloud {
        return this.appVerControl.value.cloud_config.map(c => c.cloud);
    }

    /* Set global request credentials based on user entered data */
    setRequestCredentials(creds: Credentials) {
        this._http.setCloudCredentials(creds);
    }

    onSubmit(formValues: any): void {
        this.errorMessage = null;
        this.submitPending = true;
        let deployment = this.formToDeployment(formValues);
        this._deploymentService.createDeployment(deployment).subscribe(
            data => this._router.navigate(['appliances']),
            error => this.handleErrors(error));
    }

    formToDeployment(formValues: any) : Deployment {
        let d = new Deployment();
        d.name = formValues['name'];
        d.application = formValues['application'].slug;
        d.application_version = formValues['application_version'].version;
        d.target_cloud = formValues['target_cloud'].id;
        d.config_app = formValues['config_app'];
        return d;
    }

    handleErrors(errors) {
        this.submitPending = false;
        if (errors) {
            if (errors.hasOwnProperty("error")) {
                this.errorMessage = `${errors.error}`;
            }

            for (let err of errors) {
                alert(err);
                //this.applianceLaunchForm.controls[error].setErrors({ remote: error });
            }
        }
        else {
            this.errorMessage = `${errors.reasonPhrase} (${errors.code})`;
        }
    }

}
