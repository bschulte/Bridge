import { NgModule } from '@angular/core'
import { RouteReuseStrategy, RouterModule, Routes } from '@angular/router'

import { BrowseComponent } from './components/browse/browse.component'
import { SettingsComponent } from './components/settings/settings.component'
import { ToolsComponent } from './components/tools/tools.component'
import { MyLibraryComponent } from './components/my-library/my-library.component'
import { TabPersistStrategy } from './core/tab-persist.strategy'

const routes: Routes = [
	{ path: 'browse', component: BrowseComponent, data: { shouldReuse: true } },
	{ path: 'my-library', component: MyLibraryComponent, data: { shouldReuse: true } },
	{ path: 'tools', component: ToolsComponent, data: { shouldReuse: true } },
	{ path: 'settings', component: SettingsComponent, data: { shouldReuse: true } },
	{ path: 'about', redirectTo: '/browse' },
	{ path: '**', redirectTo: '/browse' },
]

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule],
	providers: [
		{ provide: RouteReuseStrategy, useClass: TabPersistStrategy },
	],
})
export class AppRoutingModule { }
