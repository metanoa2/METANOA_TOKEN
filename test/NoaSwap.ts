import { ethers } from "hardhat";
import { BigNumber, constants } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { NOA } from "../types/contracts/NOA.sol/NOA";
import { TestNOA } from "../types/contracts/TestNOA";
import { NoaSwap } from "../types/contracts/NoaSwap.sol/NoaSwap";

import { ERRORS } from "./constants";
import { expectEvent, expectRevert, timeTravel } from "./helpers";
import { Test } from "mocha";
const { expect } = chai;

chai.use(solidity);

describe("Noa Swap Test", function () {
    let noaContract: NOA;
    let testNoaContract: TestNOA;
    let noaSwapContract: NoaSwap;

    let user1SwapContract: NoaSwap;
    let newOwnerSwapContract: NoaSwap;
    let user1TestNoaContract: TestNOA;
    let owner: string;
    let user1: string;
    let newOwner: string;

    beforeEach(async function () {
        const accounts = await ethers.getSigners();
        const ownerSigner = accounts[0];
        owner = await ownerSigner.getAddress();
        user1 = await accounts[1].getAddress();
        newOwner = await accounts[2].getAddress();

        const NoaContract = await ethers.getContractFactory("NOA", ownerSigner);
        noaContract = (await NoaContract.deploy()) as NOA;
        await noaContract.deployed();

        const TestNoaContract = await ethers.getContractFactory("TestNOA", ownerSigner);
        testNoaContract = (await TestNoaContract.deploy()) as TestNOA;
        await testNoaContract.deployed();
        user1TestNoaContract = testNoaContract.connect(accounts[1]);

        const NoaSwapContract = await ethers.getContractFactory("NoaSwap", ownerSigner);
        noaSwapContract = (await NoaSwapContract.deploy(testNoaContract.address, noaContract.address)) as NoaSwap;
        await noaSwapContract.deployed();

        user1SwapContract = noaSwapContract.connect(accounts[1]);
        newOwnerSwapContract = noaSwapContract.connect(accounts[2]);
    });

    describe("1. Swap Test", async function () {
        it("1-1 should token address info right", async function () {
            expect(await noaSwapContract.legacyNOA()).to.equal(testNoaContract.address);
            expect(await noaSwapContract.METANOA()).to.equal(noaContract.address);
        });

        it("1-2 should swap right", async function () {
            await expectRevert(user1SwapContract.swap(), ERRORS.INSUFFICIENT_NOA);

            const swapAmount = 1000000;
            await testNoaContract.transfer(user1, swapAmount);
            expect(await testNoaContract.balanceOf(user1)).to.equal(swapAmount);

            await expectRevert(user1SwapContract.swap(), ERRORS.ALLOWANCE_TOO_LOW);

            await user1TestNoaContract.approve(noaSwapContract.address, ethers.constants.MaxInt256);

            await expectRevert(user1SwapContract.swap(), ERRORS.INSUFFICIENT_METANOA);

            await noaContract.transfer(noaSwapContract.address, swapAmount);
            expect(await noaContract.balanceOf(noaSwapContract.address)).to.equal(swapAmount);

            await user1SwapContract.swap();
            expect(await testNoaContract.balanceOf(user1)).to.equal(0);
            expect(await testNoaContract.balanceOf(noaSwapContract.address)).to.equal(swapAmount);
            expect(await noaContract.balanceOf(user1)).to.equal(swapAmount);
            expect(await noaContract.balanceOf(noaSwapContract.address)).to.equal(0);
        });
    });

    describe("2. Withdraw Test", async function () {
        it("2-1 should withdraw right", async function () {
            const depositAmount = 1000000;
            await noaContract.transfer(noaSwapContract.address, depositAmount);
            expect(await noaContract.balanceOf(noaSwapContract.address)).to.equal(depositAmount);

            await expectEvent(noaSwapContract.transferOwnership(newOwner), "OwnershipTransferred", { previousOwner: owner, newOwner: newOwner });

            await expectRevert(noaSwapContract.withdraw(), ERRORS.OWNABLE_CALLER_IS_NOT_THE_OWNER);
            await newOwnerSwapContract.withdraw();
            expect(await noaContract.balanceOf(newOwner)).to.equal(depositAmount);
        });
        it("2-2 should withdraw legacy right", async function () {
            const swapAmount = 1000000;
            await testNoaContract.transfer(user1, swapAmount);
            await user1TestNoaContract.approve(noaSwapContract.address, ethers.constants.MaxInt256);
            await noaContract.transfer(noaSwapContract.address, swapAmount);
            await user1SwapContract.swap();

            await expectEvent(noaSwapContract.transferOwnership(newOwner), "OwnershipTransferred", { previousOwner: owner, newOwner: newOwner });
            await newOwnerSwapContract.withdrawLegacy();
            expect(await testNoaContract.balanceOf(newOwner)).to.equal(swapAmount);
        });
    });
});
