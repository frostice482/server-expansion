// Type definitions for Minecraft Bedrock Edition script APIs (experimental) 0.1
// Project: https://docs.microsoft.com/minecraft/creator/
// Definitions by: Jake Shirley <https://github.com/JakeShirley>
//                 Mike Ammerlaan <https://github.com/mammerla>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/***************************************************************************************************************\
|                                                                                                               |
|    Copyright (c) Microsoft Corporation.                                                                       |
|                                                                                                               |
|    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and          |
|    associated documentation files (the "Software"), to deal in the Software without restriction,              |
|    including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,      |
|    and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,      |
|    subject to the following conditions:                                                                       |
|                                                                                                               |
|    The above copyright notice and this permission notice shall be included in all copies or substantial       |
|    portions of the Software.                                                                                  |
|                                                                                                               |
|    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT      |
|    LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.        |
|    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,    |
|    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE        |
|    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                     |
|                                                                                                               |
\***************************************************************************************************************/
/** */

declare module 'mojang-gametest' {
    import * as mojangminecraft from 'mojang-minecraft';
    export enum FluidType {
        water = 0,
        lava = 1,
        powderSnow = 2,
        potion = 3,
    }
    export class FenceConnectivity {
        readonly 'east': boolean;
        readonly 'north': boolean;
        readonly 'south': boolean;
        readonly 'west': boolean;
        protected constructor();
    }
    export class GameTestSequence {
        thenExecute(callback: () => void): GameTestSequence;
        thenExecuteAfter(delayTicks: number, callback: () => void): GameTestSequence;
        thenExecuteFor(tickCount: number, callback: () => void): GameTestSequence;
        thenFail(errorMessage: string): void;
        thenIdle(delayTicks: number): GameTestSequence;
        thenSucceed(): void;
        thenWait(callback: () => void): GameTestSequence;
        thenWaitAfter(delayTicks: number, callback: () => void): GameTestSequence;
        protected constructor();
    }
    export class RegistrationBuilder {
        batch(batchName: 'night' | 'day'): RegistrationBuilder;
        maxAttempts(attemptCount: number): RegistrationBuilder;
        maxTicks(tickCount: number): RegistrationBuilder;
        padding(paddingBlocks: number): RegistrationBuilder;
        required(isRequired: boolean): RegistrationBuilder;
        requiredSuccessfulAttempts(attemptCount: number): RegistrationBuilder;
        rotateTest(rotate: boolean): RegistrationBuilder;
        setupTicks(tickCount: number): RegistrationBuilder;
        structureName(structureName: string): RegistrationBuilder;
        tag(tag: string): RegistrationBuilder;
        protected constructor();
    }
    export class SculkSpreader {
        readonly 'maxCharge': number;
        addCursorsWithOffset(offset: mojangminecraft.BlockLocation, charge: number): void;
        getCursorPosition(index: number): mojangminecraft.BlockLocation;
        getNumberOfCursors(): number;
        getTotalCharge(): number;
        protected constructor();
    }
    export class SimulatedPlayer extends mojangminecraft.Player {
        readonly 'dimension': mojangminecraft.Dimension;
        readonly 'headLocation': mojangminecraft.Location;
        readonly 'headRotation': mojangminecraft.XYRotation;
        readonly 'id': string;
        'isSneaking': boolean;
        readonly 'location': mojangminecraft.Location;
        readonly 'name': string;
        'nameTag': string;
        readonly 'onScreenDisplay': mojangminecraft.ScreenDisplay;
        readonly 'rotation': mojangminecraft.XYRotation;
        readonly 'scoreboard': mojangminecraft.ScoreboardIdentity;
        'selectedSlot': number;
        'target': mojangminecraft.Entity;
        readonly 'velocity': mojangminecraft.Vector;
        readonly 'viewVector': mojangminecraft.Vector;
        addEffect(
            effectType: mojangminecraft.EffectType,
            duration: number,
            amplifier?: number,
            showParticles?: boolean,
        ): void;
        addExperience(amount: number): boolean;
        addTag(tag: string): boolean;
        attack(): boolean;
        attackEntity(entity: mojangminecraft.Entity): boolean;
        breakBlock(blockLocation: mojangminecraft.BlockLocation, direction?: number): boolean;
        getBlockFromViewVector(options?: mojangminecraft.BlockRaycastOptions): mojangminecraft.Block;
        //getComponent(componentId: string): mojangminecraft.IEntityComponent;
        getComponents(): mojangminecraft.IEntityComponent[];
        getDynamicProperty(identifier: string): boolean | number | string;
        getEffect(effectType: mojangminecraft.EffectType): mojangminecraft.Effect;
        getEntitiesFromViewVector(options?: mojangminecraft.EntityRaycastOptions): mojangminecraft.Entity[];
        getItemCooldown(itemCategory: string): number;
        getTags(): string[];
        giveItem(itemStack: mojangminecraft.ItemStack, selectSlot?: boolean): boolean;
        hasComponent(componentId: string): boolean;
        hasTag(tag: string): boolean;
        interact(): boolean;
        interactWithBlock(blockLocation: mojangminecraft.BlockLocation, direction?: number): boolean;
        interactWithEntity(entity: mojangminecraft.Entity): boolean;
        jump(): boolean;
        kill(): void;
        lookAtBlock(blockLocation: mojangminecraft.BlockLocation): void;
        lookAtEntity(entity: mojangminecraft.Entity): void;
        lookAtLocation(location: mojangminecraft.Location): void;
        move(westEast: number, northSouth: number, speed?: number): void;
        moveRelative(leftRight: number, backwardForward: number, speed?: number): void;
        moveToBlock(blockLocation: mojangminecraft.BlockLocation, speed?: number): void;
        moveToLocation(location: mojangminecraft.Location, speed?: number): void;
        navigateToBlock(blockLocation: mojangminecraft.BlockLocation, speed?: number): mojangminecraft.NavigationResult;
        navigateToEntity(entity: mojangminecraft.Entity, speed?: number): mojangminecraft.NavigationResult;
        navigateToLocation(location: mojangminecraft.Location, speed?: number): mojangminecraft.NavigationResult;
        navigateToLocations(locations: mojangminecraft.Location[], speed?: number): void;
        playSound(soundID: string, soundOptions?: mojangminecraft.SoundOptions): void;
        removeDynamicProperty(identifier: string): boolean;
        removeTag(tag: string): boolean;
        rotateBody(angleInDegrees: number): void;
        runCommand(commandString: string): any;
        runCommandAsync(commandString: string): Promise<mojangminecraft.CommandResult>;
        setBodyRotation(angleInDegrees: number): void;
        setDynamicProperty(identifier: string, value: boolean | number | string): void;
        setGameMode(gameMode: mojangminecraft.GameMode): void;
        setItem(itemStack: mojangminecraft.ItemStack, slot: number, selectSlot?: boolean): boolean;
        setRotation(degreesX: number, degreesY: number): void;
        setVelocity(velocity: mojangminecraft.Vector): void;
        startItemCooldown(itemCategory: string, tickDuration: number): void;
        stopBreakingBlock(): void;
        stopInteracting(): void;
        stopMoving(): void;
        stopUsingItem(): void;
        teleport(
            location: mojangminecraft.Location,
            dimension: mojangminecraft.Dimension,
            xRotation: number,
            yRotation: number,
        ): void;
        teleportFacing(
            location: mojangminecraft.Location,
            dimension: mojangminecraft.Dimension,
            facingLocation: mojangminecraft.Location,
        ): void;
        triggerEvent(eventName: string): void;
        useItem(itemStack: mojangminecraft.ItemStack): boolean;
        useItemInSlot(slot: number): boolean;
        useItemInSlotOnBlock(
            slot: number,
            blockLocation: mojangminecraft.BlockLocation,
            direction?: number,
            faceLocationX?: number,
            faceLocationY?: number,
        ): boolean;
        useItemOnBlock(
            itemStack: mojangminecraft.ItemStack,
            blockLocation: mojangminecraft.BlockLocation,
            direction?: number,
            faceLocationX?: number,
            faceLocationY?: number,
        ): boolean;
        protected constructor();
    }
    // tslint:disable-next-line:no-unnecessary-class
    export class Tags {
        static readonly 'suiteAll' = 'suite:all';
        static readonly 'suiteDebug' = 'suite:debug';
        static readonly 'suiteDefault' = 'suite:default';
        static readonly 'suiteDisabled' = 'suite:disabled';
        protected constructor();
    }
    export class Test {
        assert(condition: boolean, message: string): void;
        assertBlockPresent(
            blockType: mojangminecraft.BlockType,
            blockLocation: mojangminecraft.BlockLocation,
            isPresent?: boolean,
        ): void;
        assertBlockState(
            blockLocation: mojangminecraft.BlockLocation,
            callback: (arg: mojangminecraft.Block) => boolean,
        ): void;
        assertCanReachLocation(
            mob: mojangminecraft.Entity,
            blockLocation: mojangminecraft.BlockLocation,
            canReach?: boolean,
        ): void;
        assertContainerContains(itemStack: mojangminecraft.ItemStack, blockLocation: mojangminecraft.BlockLocation): void;
        assertContainerEmpty(blockLocation: mojangminecraft.BlockLocation): void;
        assertEntityHasArmor(
            entityTypeIdentifier: string,
            armorSlot: number,
            armorName: string,
            armorData: number,
            blockLocation: mojangminecraft.BlockLocation,
            hasArmor?: boolean,
        ): void;
        assertEntityHasComponent(
            entityTypeIdentifier: string,
            componentIdentifier: string,
            blockLocation: mojangminecraft.BlockLocation,
            hasComponent?: boolean,
        ): void;
        assertEntityInstancePresent(
            entity: mojangminecraft.Entity,
            blockLocation: mojangminecraft.BlockLocation,
            isPresent?: boolean,
        ): void;
        assertEntityPresent(
            entityTypeIdentifier: string,
            blockLocation: mojangminecraft.BlockLocation,
            isPresent?: boolean,
        ): void;
        assertEntityPresentInArea(entityTypeIdentifier: string, isPresent?: boolean): void;
        assertEntityState(
            blockLocation: mojangminecraft.BlockLocation,
            entityTypeIdentifier: string,
            callback: (arg: mojangminecraft.Entity) => boolean,
        ): void;
        assertEntityTouching(entityTypeIdentifier: string, location: mojangminecraft.Location, isTouching?: boolean): void;
        assertIsWaterlogged(blockLocation: mojangminecraft.BlockLocation, isWaterlogged?: boolean): void;
        assertItemEntityCountIs(
            itemType: mojangminecraft.ItemType,
            blockLocation: mojangminecraft.BlockLocation,
            searchDistance: number,
            count: number,
        ): void;
        assertItemEntityPresent(
            itemType: mojangminecraft.ItemType,
            blockLocation: mojangminecraft.BlockLocation,
            searchDistance: number,
            isPresent?: boolean,
        ): void;
        assertRedstonePower(blockLocation: mojangminecraft.BlockLocation, power: number): void;
        destroyBlock(blockLocation: mojangminecraft.BlockLocation, dropResources?: boolean): void;
        fail(errorMessage: string): void;
        failIf(callback: () => void): void;
        getBlock(blockLocation: mojangminecraft.BlockLocation): mojangminecraft.Block;
        getDimension(): mojangminecraft.Dimension;
        getFenceConnectivity(blockLocation: mojangminecraft.BlockLocation): FenceConnectivity;
        getSculkSpreader(blockLocation: mojangminecraft.BlockLocation): SculkSpreader;
        getTestDirection(): mojangminecraft.Direction;
        idle(tickDelay: number): Promise<void>;
        killAllEntities(): void;
        pressButton(blockLocation: mojangminecraft.BlockLocation): void;
        print(text: string): void;
        pullLever(blockLocation: mojangminecraft.BlockLocation): void;
        pulseRedstone(blockLocation: mojangminecraft.BlockLocation, duration: number): void;
        relativeBlockLocation(worldBlockLocation: mojangminecraft.BlockLocation): mojangminecraft.BlockLocation;
        relativeLocation(worldLocation: mojangminecraft.Location): mojangminecraft.Location;
        removeSimulatedPlayer(simulatedPlayer: SimulatedPlayer): void;
        rotateDirection(direction: mojangminecraft.Direction): mojangminecraft.Direction;
        rotateVector(vector: mojangminecraft.Vector): mojangminecraft.Vector;
        runAfterDelay(delayTicks: number, callback: () => void): void;
        runAtTickTime(tick: number, callback: () => void): void;
        setBlockPermutation(
            blockData: mojangminecraft.BlockPermutation,
            blockLocation: mojangminecraft.BlockLocation,
        ): void;
        setBlockType(blockType: mojangminecraft.BlockType, blockLocation: mojangminecraft.BlockLocation): void;
        setFluidContainer(location: mojangminecraft.BlockLocation, type: number): void;
        setTntFuse(entity: mojangminecraft.Entity, fuseLength: number): void;
        spawn(entityTypeIdentifier: string, blockLocation: mojangminecraft.BlockLocation): mojangminecraft.Entity;
        spawnAtLocation(entityTypeIdentifier: string, location: mojangminecraft.Location): mojangminecraft.Entity;
        spawnItem(itemStack: mojangminecraft.ItemStack, location: mojangminecraft.Location): mojangminecraft.Entity;
        spawnSimulatedPlayer(
            blockLocation: mojangminecraft.BlockLocation,
            name?: string,
            gameMode?: mojangminecraft.GameMode,
        ): SimulatedPlayer;
        spawnWithoutBehaviors(
            entityTypeIdentifier: string,
            blockLocation: mojangminecraft.BlockLocation,
        ): mojangminecraft.Entity;
        spawnWithoutBehaviorsAtLocation(
            entityTypeIdentifier: string,
            location: mojangminecraft.Location,
        ): mojangminecraft.Entity;
        spreadFromFaceTowardDirection(
            blockLocation: mojangminecraft.BlockLocation,
            fromFace: mojangminecraft.Direction,
            direction: mojangminecraft.Direction,
        ): void;
        startSequence(): GameTestSequence;
        succeed(): void;
        succeedIf(callback: () => void): void;
        succeedOnTick(tick: number): void;
        succeedOnTickWhen(tick: number, callback: () => void): void;
        succeedWhen(callback: () => void): void;
        succeedWhenBlockPresent(
            blockType: mojangminecraft.BlockType,
            blockLocation: mojangminecraft.BlockLocation,
            isPresent?: boolean,
        ): void;
        succeedWhenEntityHasComponent(
            entityTypeIdentifier: string,
            componentIdentifier: string,
            blockLocation: mojangminecraft.BlockLocation,
            hasComponent: boolean,
        ): void;
        succeedWhenEntityPresent(
            entityTypeIdentifier: string,
            blockLocation: mojangminecraft.BlockLocation,
            isPresent?: boolean,
        ): void;
        triggerInternalBlockEvent(
            blockLocation: mojangminecraft.BlockLocation,
            event: string,
            eventParameters?: number[],
        ): void;
        until(callback: () => void): Promise<void>;
        walkTo(mob: mojangminecraft.Entity, blockLocation: mojangminecraft.BlockLocation, speedModifier?: number): void;
        walkToLocation(mob: mojangminecraft.Entity, location: mojangminecraft.Location, speedModifier?: number): void;
        worldBlockLocation(relativeBlockLocation: mojangminecraft.BlockLocation): mojangminecraft.BlockLocation;
        worldLocation(relativeLocation: mojangminecraft.Location): mojangminecraft.Location;
        protected constructor();
    }
    export function register(
        testClassName: string,
        testName: string,
        testFunction: (arg: Test) => void,
    ): RegistrationBuilder;
    export function registerAsync(
        testClassName: string,
        testName: string,
        testFunction: (arg: Test) => Promise<void>,
    ): RegistrationBuilder;
}
