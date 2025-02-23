import { createHostedZone } from '~/lib/dns.server';
import {
  createUserRecord,
  deleteUserRecord,
  updateUserRecord,
  willExpireIn,
  isExpired,
  removeIfExpired,
  setMonthsFromNow,
} from '~/lib/domains.server';
import { prisma } from '~/db.server';
import { RecordType } from '@prisma/client';

import type { DomainRecord } from '~/lib/domains.server';

const resetHostedZone = () => {
  try {
    fetch('http://localhost:5053/moto-api/reset', {
      method: 'POST',
    });
  } catch (error) {
    throw new Error(`Error occurred while deleting records in hosted zone: ${error}`);
  }
};

describe('Domains module function test', () => {
  const rootDomain = 'starchart.com';
  const username = 'starchartdev';
  const description = 'This is to test';
  const course = 'OSD700';
  const ports = '8080';
  const randomWord = (function () {
    let seed = Date.now();
    return () => String(seed++);
  })();

  beforeAll(async () => {
    process.env.AWS_ROUTE53_HOSTED_ZONE_ID = await createHostedZone(rootDomain);
    process.env.ROOT_DOMAIN = rootDomain;
  });

  afterAll(() => resetHostedZone());

  test('createUserRecord() creates a record in Route 53 and DB', async () => {
    const subDomain = randomWord();
    const domain = `${subDomain}.${username}.${rootDomain}`;
    const value = '192.168.0.1';
    const data: DomainRecord = {
      type: RecordType.A,
      name: domain,
      value,
      username,
    };

    const result = await createUserRecord(data);

    expect(result.name).toEqual(domain);
    expect(result.type).toEqual('A');
    expect(result.value).toEqual(value);
    expect(result.createdAt).not.toBeNaN();
    expect(result.updatedAt.getTime()).toEqual(result.createdAt.getTime());
    expect(result.expiresAt.getTime()).toBeGreaterThan(result.createdAt.getTime());
    expect(result.status).toEqual('pending');
  });

  test('createUserRecord() throws when record with name, type, value already exists', async () => {
    const subDomain = randomWord();
    const domain = `${subDomain}.${username}.${rootDomain}`;
    const value = '192.168.0.2';
    const data: DomainRecord = {
      type: RecordType.A,
      name: domain,
      value,
      username,
    };

    await createUserRecord(data);

    await expect(createUserRecord(data)).rejects.toThrow();
  });

  test('createUserRecord() throws when non existing username is provided', async () => {
    const subDomain = randomWord();
    const domain = `${subDomain}.${username}.${rootDomain}`;
    const value = '192.168.0.1';
    const data: DomainRecord = {
      type: RecordType.A,
      name: domain,
      value,
      username: 'NOT EXIST',
    };

    await expect(createUserRecord(data)).rejects.toThrow();
  });

  test('updateUserRecord() updates a record in Route 53 and DB', async () => {
    const subDomain = randomWord();
    const domain = `${subDomain}.${username}.${rootDomain}`;
    const value = '192.168.0.1';
    let data: DomainRecord = {
      type: RecordType.A,
      name: domain,
      value,
      username,
    };

    const result = await createUserRecord(data);

    const updatedValue = '2001:db8:3333:4444:5555:6666:7777:8888';
    data.type = RecordType.AAAA;
    data.value = updatedValue;
    data.id = result.id;
    data.description = description;
    data.course = course;
    data.ports = ports;

    const updatedResult = await updateUserRecord(data);

    expect(updatedResult.type).toEqual('AAAA');
    expect(updatedResult.value).toEqual(updatedValue);
    expect(updatedResult.description).toEqual(description);
    expect(updatedResult.course).toEqual(course);
    expect(updatedResult.ports).toEqual(ports);
    expect(updatedResult.updatedAt.getTime()).toBeGreaterThan(result.createdAt.getTime());
    expect(updatedResult.expiresAt.getTime()).toBeGreaterThan(result.updatedAt.getTime());
    expect(result.status).toEqual('pending');
  });

  test('updateUserRecord() throws when attempting to update non existing ID in DB', async () => {
    let data: DomainRecord = {
      type: RecordType.A,
      name: `update.${username}.${rootDomain}`,
      value: '192.168.0.2',
      id: 0,
      username,
      description,
      course,
      ports,
    };

    await expect(updateUserRecord(data)).rejects.toThrow();
  });

  test('deleteUserRecord() deletes a record in Route 53 and DB', async () => {
    const subDomain = randomWord();
    const domain = `${subDomain}.${username}.${rootDomain}`;
    const value = '192.168.0.1';
    let data: DomainRecord = {
      type: RecordType.A,
      name: domain,
      value,
      username,
    };

    const result = await createUserRecord(data);
    data.id = result.id;

    const deleteResult = await deleteUserRecord(data);
    expect(deleteResult.id).toEqual(result.id);
    expect(deleteResult.name).toEqual(result.name);
    expect(deleteResult.type).toEqual(result.type);
    expect(deleteResult.value).toEqual(result.value);
    expect(deleteResult.status.length).toBeGreaterThan(0);
  });

  test('deleteUserRecord() throws when attempting to delete non existing ID in DB', async () => {
    let data: DomainRecord = {
      type: RecordType.A,
      name: `delete.${username}.${rootDomain}`,
      value: '192.168.0.3',
      id: 0,
      username,
    };

    await expect(deleteUserRecord(data)).rejects.toThrow();
  });

  test('removeIfExpired() deletes an expired record in Route 53 and DB ', async () => {
    const subDomain = randomWord();
    const domain = `${subDomain}.${username}.${rootDomain}`;
    const value = 'cname.test.com';
    let data: DomainRecord = {
      type: RecordType.CNAME,
      name: domain,
      value,
      username,
    };

    const result = await createUserRecord(data);
    const id = result.id;

    await prisma.record.update({
      where: {
        id,
      },
      data: {
        expiresAt: setMonthsFromNow(-1),
      },
    });
    data.id = result.id;

    const deleteResult = await removeIfExpired(data);

    expect(deleteResult?.id).toEqual(id);
    expect(deleteResult?.name).toEqual(result.name);
    expect(deleteResult?.type).toEqual(result.type);
    expect(deleteResult?.value).toEqual(result.value);
    expect(deleteResult?.status.length).toBeGreaterThan(0);
  });

  test('isExpired() returns true when current time is greater than expiresAt. Otherwise returning false', () => {
    expect(isExpired(setMonthsFromNow(-1))).toBeTruthy();
    expect(isExpired(setMonthsFromNow(1))).toBeFalsy();
  });

  test('willExpireIn() returns true when expiresAt is less than a month from now', () => {
    const todayPlusHalfMonth = setMonthsFromNow(0.5);
    const todayPlusTwoMonth = setMonthsFromNow(2);

    expect(willExpireIn(todayPlusHalfMonth)).toBeTruthy();
    expect(willExpireIn(todayPlusTwoMonth)).toBeFalsy();
  });
});
