import { Component, OnInit } from '@angular/core'
import { SettingsService } from '../../core/services/settings.service'
import { ChartData } from 'src-shared/interfaces/search.interface'

@Component({
	selector: 'app-my-library',
	templateUrl: './my-library.component.html',
	standalone: false,
})
export class MyLibraryComponent implements OnInit {
	public songs: ChartData[] = []
	public filteredSongs: ChartData[] = []
	public selectedSongs: Set<string> = new Set()
	public searchTerm = ''

	constructor(public settingsService: SettingsService) { }

	ngOnInit() {
		this.loadLibrarySongs()
	}

	async loadLibrarySongs() {
		if (!this.settingsService.libraryDirectory) {
			return
		}

		try {
			const songs = await window.electron.invoke.getLibrarySongs(this.settingsService.libraryDirectory)
			this.songs = songs
			this.filterSongs()
			this.selectedSongs.clear()
		} catch (err) {
			console.error('Error loading library songs:', err)
		}
	}

	filterSongs() {
		if (!this.searchTerm) {
			this.filteredSongs = this.songs
			return
		}

		const searchTermLower = this.searchTerm.toLowerCase()
		this.filteredSongs = this.songs.filter(song =>
			(song.name?.toLowerCase().includes(searchTermLower) ?? false) ||
			(song.artist?.toLowerCase().includes(searchTermLower) ?? false) ||
			(song.album?.toLowerCase().includes(searchTermLower) ?? false)
		)
	}

	onSearchInput(event: Event) {
		this.searchTerm = (event.target as HTMLInputElement).value
		this.filterSongs()
	}

	toggleSongSelection(song: ChartData) {
		if (this.selectedSongs.has(song.drivePath)) {
			this.selectedSongs.delete(song.drivePath)
		} else {
			this.selectedSongs.add(song.drivePath)
		}
	}

	openDeleteModal() {
		const modal = document.getElementById('delete_confirm_modal') as HTMLDialogElement
		modal.showModal()
	}

	async deleteSelectedSongs() {
		if (this.selectedSongs.size === 0) {
			return
		}

		const paths = Array.from(this.selectedSongs)
		try {
			await window.electron.invoke.deleteLibrarySongs(paths)
			await this.loadLibrarySongs()
		} catch (err) {
			console.error('Error deleting songs:', err)
		}
	}

	openSongFolder(song: ChartData) {
		window.electron.emit.showFolder(song.drivePath)
	}
}
