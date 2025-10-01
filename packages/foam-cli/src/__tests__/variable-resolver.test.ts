import { Resolver } from '../utils/variable-resolver';

describe('Resolver', () => {
  describe('resolveText', () => {
    it('should resolve FOAM_TITLE', async () => {
      const resolver = new Resolver(new Map(), new Date(), 'My Title');
      const result = await resolver.resolveText('Title: $FOAM_TITLE');
      expect(result).toBe('Title: My Title');
    });

    it('should resolve FOAM_TITLE_SAFE', async () => {
      const resolver = new Resolver(
        new Map(),
        new Date(),
        'Title: With* Special? Chars!'
      );
      const result = await resolver.resolveText('Safe: $FOAM_TITLE_SAFE');
      expect(result).toBe('Safe: Title- With- Special- Chars-');
    });

    it('should resolve FOAM_SLUG', async () => {
      const resolver = new Resolver(new Map(), new Date(), 'My Test Title');
      const result = await resolver.resolveText('Slug: $FOAM_SLUG');
      expect(result).toBe('Slug: my-test-title');
    });

    it('should resolve FOAM_DATE_YEAR', async () => {
      const date = new Date('2024-01-15T10:30:00');
      const resolver = new Resolver(new Map(), date);
      const result = await resolver.resolveText('Year: $FOAM_DATE_YEAR');
      expect(result).toBe('Year: 2024');
    });

    it('should resolve FOAM_DATE_MONTH', async () => {
      const date = new Date('2024-01-15T10:30:00');
      const resolver = new Resolver(new Map(), date);
      const result = await resolver.resolveText('Month: $FOAM_DATE_MONTH');
      expect(result).toBe('Month: 01');
    });

    it('should resolve FOAM_DATE_DATE', async () => {
      const date = new Date('2024-01-15T10:30:00');
      const resolver = new Resolver(new Map(), date);
      const result = await resolver.resolveText('Date: $FOAM_DATE_DATE');
      expect(result).toBe('Date: 15');
    });

    it('should resolve custom variables', async () => {
      const customVars = new Map([
        ['CUSTOM_VAR1', 'Value1'],
        ['CUSTOM_VAR2', 'Value2'],
      ]);
      const resolver = new Resolver(customVars, new Date());
      const result = await resolver.resolveText(
        '$CUSTOM_VAR1 and $CUSTOM_VAR2'
      );
      expect(result).toBe('Value1 and Value2');
    });

    it('should resolve multiple variables in one text', async () => {
      const date = new Date('2024-01-15T10:30:00');
      const resolver = new Resolver(new Map(), date, 'My Note');
      const result = await resolver.resolveText(
        '# $FOAM_TITLE\n\nDate: $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE'
      );
      expect(result).toBe('# My Note\n\nDate: 2024-01-15');
    });

    it('should handle undefined variables by removing them', async () => {
      const resolver = new Resolver(new Map(), new Date());
      const result = await resolver.resolveText('Value: $UNDEFINED_VAR');
      expect(result).toBe('Value: ');
    });
  });

  describe('define', () => {
    it('should allow defining variables after construction', async () => {
      const resolver = new Resolver(new Map(), new Date());
      resolver.define('MY_VAR', 'My Value');
      const result = await resolver.resolveText('$MY_VAR');
      expect(result).toBe('My Value');
    });
  });

  describe('getVariables', () => {
    it('should return all defined variables as a plain object', () => {
      const vars = new Map([
        ['VAR1', 'Value1'],
        ['VAR2', 'Value2'],
      ]);
      const resolver = new Resolver(vars, new Date());
      const result = resolver.getVariables();
      expect(result).toEqual({
        VAR1: 'Value1',
        VAR2: 'Value2',
      });
    });
  });

  describe('date variables', () => {
    it('should resolve all date format variables correctly', async () => {
      const date = new Date('2024-01-15T14:30:45');
      const resolver = new Resolver(new Map(), date);

      const year = await resolver.resolveFromName('FOAM_DATE_YEAR');
      const month = await resolver.resolveFromName('FOAM_DATE_MONTH');
      const day = await resolver.resolveFromName('FOAM_DATE_DATE');
      const hour = await resolver.resolveFromName('FOAM_DATE_HOUR');
      const minute = await resolver.resolveFromName('FOAM_DATE_MINUTE');
      const second = await resolver.resolveFromName('FOAM_DATE_SECOND');

      expect(year).toBe('2024');
      expect(month).toBe('01');
      expect(day).toBe('15');
      expect(hour).toBe('14');
      expect(minute).toBe('30');
      expect(second).toBe('45');
    });

    it('should resolve FOAM_DATE_SECONDS_UNIX', async () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const resolver = new Resolver(new Map(), date);
      const result = await resolver.resolveFromName('FOAM_DATE_SECONDS_UNIX');
      const expectedSeconds = Math.floor(date.getTime() / 1000).toString();
      expect(result).toBe(expectedSeconds);
    });
  });
});
