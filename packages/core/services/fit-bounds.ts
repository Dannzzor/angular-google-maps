import { MapsAPILoader } from './maps-api-loader/maps-api-loader';
import { LatLngLiteral, LatLngBounds, LatLng, LatLngBoundsLiteral } from './google-maps-types';
import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { of } from 'rxjs/observable/of';
import {
  skipWhile,
  flatMap,
  mergeMap,
  debounce,
  map,
  distinctUntilChanged
} from 'rxjs/operators';
import { timer } from 'rxjs/observable/timer';
import { Subject } from 'rxjs/Subject';

declare var google: any;

export interface FitBoundsDetails {
  latLng: LatLng|LatLngLiteral;
}

export abstract class FitBoundsAccessor {
  abstract getFitBoundsDetails$(): Observable<FitBoundsDetails>;
}

@Injectable()
export class FitBoundsService {
  readonly bounds$: Observable<LatLngBounds>;
  protected readonly _boundsChangeDebounceTime$: BehaviorSubject<number> = new BehaviorSubject<number>(200);
  protected readonly _includeInBounds$: BehaviorSubject<Map<string, LatLng | LatLngLiteral>> = new BehaviorSubject<Map<string, LatLng | LatLngLiteral>>(new Map<string, LatLng | LatLngLiteral>());
  protected _emitPaused: boolean = false;

  constructor(loader: MapsAPILoader) {
    this.bounds$ = of(loader.load()).pipe(
      flatMap(() => this._includeInBounds$),
      skipWhile(() => this._emitPaused),
      // debounce(() => this._boundsChangeDebounceTime$),
      map((includeInBounds: Map<string, LatLng | LatLngLiteral>) => {
        const bounds = new google.maps.LatLngBounds() as LatLngBounds;
        includeInBounds.forEach(b => bounds.extend(<LatLng|LatLngLiteral>b));
        return bounds;
      })
    );
  }

  addToBounds(latLng: LatLng | LatLngLiteral) {
    const latLngStr = latLng.toString();
    if (this._includeInBounds$.value.has(latLngStr)) {
      return;
    }
    const map = this._includeInBounds$.value;
    map.set(latLngStr, latLng);
    this._includeInBounds$.next(map);
  }

  removeFromBounds(latLng: LatLng|LatLngLiteral) {
    const map = this._includeInBounds$.value;
    map.delete(latLng.toString());
    this._includeInBounds$.next(map);
  }

  changeFitBoundsDebounceTime(timeMs: number) {
    this._boundsChangeDebounceTime$.next(timeMs);
  }
}
