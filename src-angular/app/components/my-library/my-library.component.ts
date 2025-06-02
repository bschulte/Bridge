import { Component, OnInit } from '@angular/core'
import { SettingsService } from '../../core/services/settings.service'
import { ChartData } from 'src-shared/interfaces/search.interface'

type SortColumn = 'name' | 'artist' | 'album' | 'charter'
type SortDirection = 'asc' | 'desc'

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
	public sortColumn: SortColumn = 'artist'
	public sortDirection: SortDirection = 'asc'
	public Math = Math

	// Pagination
	public currentPage = 1
	public pageSize = 25
	public pageSizeOptions = [10, 25, 50, 100]

	constructor(public settingsService: SettingsService) { }

	selectAllVisible() {
		// Add all currently visible songs to the selection
		this.paginatedSongs.forEach(song => {
			this.selectedSongs.add(song.drivePath)
		})
	}

	ngOnInit() {
		this.loadLibrarySongs()
	}

	get totalPages(): number {
		return Math.ceil(this.filteredSongs.length / this.pageSize)
	}

	get paginatedSongs(): ChartData[] {
		const start = (this.currentPage - 1) * this.pageSize
		const end = start + this.pageSize
		return this.filteredSongs.slice(start, end)
	}

	onPageChange(page: number) {
		this.currentPage = page
	}

	onPageSizeChange(event: Event) {
		const select = event.target as HTMLSelectElement
		this.pageSize = Number(select.value)
		// Reset to first page when changing page size
		this.currentPage = 1
	}

	async loadLibrarySongs() {
		if (!this.settingsService.libraryDirectory) {
			return
		}

		try {
			const songs = await window.electron.invoke.getLibrarySongs(this.settingsService.libraryDirectory)
			this.songs = songs
			this.filterAndSortSongs()
			this.selectedSongs.clear()
		} catch (err) {
			console.error('Error loading library songs:', err)
		}
	}

	filterAndSortSongs() {
		// First apply the filter
		if (!this.searchTerm) {
			this.filteredSongs = [...this.songs]
		} else {
			const searchTermLower = this.searchTerm.toLowerCase()
			this.filteredSongs = this.songs.filter(song =>
				(song.name?.toLowerCase().includes(searchTermLower) ?? false) ||
				(song.artist?.toLowerCase().includes(searchTermLower) ?? false) ||
				(song.album?.toLowerCase().includes(searchTermLower) ?? false)
			)
		}

		// Always apply the sort since we always have a sort column and direction
		const aValue = (a: ChartData) => (a[this.sortColumn] || '').toLowerCase()
		const bValue = (b: ChartData) => (b[this.sortColumn] || '').toLowerCase()

		this.filteredSongs.sort((a, b) => {
			if (this.sortDirection === 'asc') {
				return aValue(a).localeCompare(bValue(b))
			} else {
				return bValue(b).localeCompare(aValue(a))
			}
		})

		// Reset to first page when filtering/sorting changes
		this.currentPage = 1
	}

	onSearchInput(event: Event) {
		this.searchTerm = (event.target as HTMLInputElement).value
		this.filterAndSortSongs()
	}

	sort(column: SortColumn) {
		if (this.sortColumn === column) {
			if (this.sortDirection === 'asc') {
				this.sortDirection = 'desc'
			} else {
				// Reset to default sort (artist ascending)
				this.sortColumn = 'artist'
				this.sortDirection = 'asc'
			}
		} else {
			// New column, start with ascending
			this.sortColumn = column
			this.sortDirection = 'asc'
		}

		this.filterAndSortSongs()
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
