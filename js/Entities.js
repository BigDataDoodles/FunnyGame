//Entities

var player = {};
var bots = {};
var updates = {};
var bullets = {};
var bonuses = {};

Entity = function (type, id, x, y, spdX, spdY, width, height, img) {
    var self = {
        type: type,
        id: id,
        x: x,
        y: y,
        spdX: spdX,
        spdY: spdY,
        width: width,
        height: height,
        img: img
    };
    self.update = function () {
        self.updatePosition();
        self.draw();
    };
    self.draw = function () {
        ctx.save();
        var x = self.x - player.x;
        var y = self.y - player.y;

        x += WIDTH / 2;
        y += HEIGHT / 2;

        x -= self.width / 2;
        y -= self.height / 2;

        ctx.drawImage(self.img,
            0, 0, self.img.width, self.img.height,
            x, y, self.width, self.height);
        ctx.restore();
    };
    self.updatePosition = function () {
        self.x += self.spdX;
        self.y += self.spdY;
        if (self.x < self.width / 2 || self.x > (currentMap.width - self.width / 2)) self.spdX = -self.spdX;
        if (self.y < self.height / 2 || self.y > (currentMap.height - self.height / 2)) self.spdY = -self.spdY;
    };
    self.getDistance = function (entity2) {
        var vx = self.x - entity2.x;
        var vy = self.y - entity2.y;
        return Math.sqrt(vx * vx + vy * vy);
    };
    self.revert = function () {
        self.spdX = -self.spdX;
        self.spdY = -self.spdY;
    };
    return self;
}

Actor = function (type, id, x, y, spdX, spdY, width, height, img, hp, attackSpd, reloadTime) {
    var self = Entity(type, id, x, y, spdX, spdY, width, height, img);
    self.hp = hp;
    self.attackSpd = attackSpd;
    self.reloadTime = reloadTime;
    self.aimAngle = 0;
    self.reloadCount = 0;
    var super_update = self.update;
    self.update = function () {
        super_update();
        self.reloadCount += self.attackSpd;
    };
    self.simpleAttack = function () {
        if (self.reloadCount > self.reloadTime){
            generateBullet(self);
            self.reloadCount = 0;
        }
    };
    self.extraAttack = function () {
        if (self.reloadCount > self.reloadTime * 2) {
            for (var angle = 0; angle < 90; angle += 30)
                generateBullet(self, angle);
            self.reloadCount = 0;
        }
    };
    return self;
}

Player = function () {
    var self = Actor('player', 'myId', 20, 20, 10, 10, 40, 40, Img.player, 10, 1, 40);
    self.updatePosition = function () {
        if (self.isPressedUp)
            self.y -= self.spdY;
        if (self.isPressedLeft)
            self.x -= self.spdX;
        if (self.isPressedDown)
            self.y += self.spdY;
        if (self.isPressedRight)
            self.x += self.spdX;

        if (self.x < self.width / 2)
            self.x = self.width / 2;
        if (self.x > currentMap.width - self.width / 2)
            self.x = currentMap.width - self.width / 2;
        if (self.y < self.height / 2)
            self.y = self.height / 2;
        if (self.y > currentMap.height - self.height / 2)
            self.y = currentMap.height - self.height / 2;
    };
    self.isPressedLeft = false;
    self.isPressedRight = false;
    self.isPressedUp = false;
    self.isPressedDown = false;
    self.activeBonus = function () {
        for (var key in bonuses) {
            if (key === BonusTypeEnum.attack && bonuses[key].lifetime > 0) {
                self.attackSpd = bonuses[key].attackSpd;
                bonuses[key].lifetime--;
            } else {
                self.attackSpd = 1;
            }
            if (key === BonusTypeEnum.score) {
                score += bonuses[key].score;
                delete bonuses[key];
            }
        }
    };
    var super_update = self.update;
    self.update = function () {
        self.activeBonus();
        super_update();
    };
    return self;
}

//Идея: это будет род. класс, а от него создать AttackBonus, ScoreBonus и т.д.
Bonus = function (type, lifetime) {
    var self = {
        id: Math.random(),
        type: type,
        lifetime: 0
    }
    if (lifetime !== undefined)
        self.lifetime = lifetime;
    return self;
}

AttackBonus = function (attackSpd, lifetime) {
    var self = Bonus(BonusTypeEnum.attack, lifetime);
    self.attackSpd = attackSpd;
    return self;
}

ScoreBonus = function (score) {
    var self = Bonus(BonusTypeEnum.score);
    self.score = score;
    return self;
}

var BonusTypeEnum = {
    attack: 'attack',
    score: 'score'
}

Bot = function (id, x, y, spdX, spdY, width, height) {
    var self = Entity('bot', id, x, y, spdX, spdY, width, height, Img.bot);
    var super_update = self.update;
    self.update = function () {
        super_update();
        if (isRectColliding(player, self)) {
            player.hp -= 1;
            self.revert();
        }
    };
    bots[id] = self;
}

Update = function (id, x, y, spdX, spdY, width, height, img, bonus) {
    var self = Entity('update', id, x, y, spdX, spdY, width, height, img);
    self.bonus = bonus;
    var super_update = self.update;
    self.update = function () {
        super_update();
        if (isRectColliding(player, self)) {
            if (self.bonus === BonusTypeEnum.attack) {
                bonuses[BonusTypeEnum.attack] = AttackBonus(5, 200);
            } else {
                bonuses[BonusTypeEnum.score] = ScoreBonus(1000);
            }
            delete updates[self.id];
        }
    };
    updates[id] = self;
}

Bullet = function (id, x, y, spdX, spdY, width, height) {
    var self = Entity('bullet', id, x, y, spdX, spdY, width, height, Img.bullet);
    self.isDestroy = function () {
        return self.x < self.width / 2
            || self.x > currentMap.width - self.width / 2
            || self.y < self.height / 2
            || self.y > currentMap.height - self.width / 2;
    };
    var super_update = self.update;
    self.update = function () {
        super_update();
        var isRemove = false;
        if (self.isDestroy()) isRemove = true;
        for (var key2 in bots) {
            if (isRectColliding(self, bots[key2])) {
                isRemove = true;
                delete bots[key2];
                bonuses[BonusTypeEnum.score] = ScoreBonus(500);
            }
        }
        if (isRemove) {
            delete bullets[self.id];
        }
    };
    bullets[id] = self;
}


//2. Functions

isRectColliding = function (rect1, rect2) {
    return rect1.x <= rect2.x + rect2.width
        && rect2.x <= rect1.x + rect1.width
        && rect1.y <= rect2.y + rect2.height
        && rect2.y <= rect1.y + rect1.height;
};

generateRandomBot = function () {
    var spdX = 1 + Math.random() * 5;
    var spdY = 1 + Math.random() * 5;
    var width = 20 + Math.random() * 20;
    var height = width;
    var x = Math.random() * currentMap.width;
    var y = Math.random() * currentMap.height;
    var name = Math.random();
    Bot(name, x, y, spdX, spdY, width, height);
};

generateRandomUpdate = function () {
    var spdX = 0;
    var spdY = 0;
    var width = 20;
    var height = 20;
    var x = Math.random() * currentMap.width;
    var y = Math.random() * currentMap.height;
    var id = Math.random();
    var bonus = null;
    var img = null;
    if(Math.random() < 0.2) {
        bonus = BonusTypeEnum.attack;
        img = Img.upgrade2;
    } else {
        bonus = BonusTypeEnum.score;
        img = Img.upgrade1;
    }
    Update(id, x, y, spdX, spdY, width, height, img, bonus);
};

generateBullet = function (actor, aimAngle) {
    var x = actor.x;
    var y = actor.y;
    var angle = actor.aimAngle;
    if (aimAngle !== undefined) {
        angle = aimAngle;
    }
    var spdX = Math.cos(angle / 180 * Math.PI) * 5;
    var spdY = Math.sin(angle / 180 * Math.PI) * 5;
    var width = 15;
    var height = 15;
    var id = Math.random();
    Bullet(id, x, y, spdX, spdY, width, height);
};

/*isReadyNewGame = function () {
       ctx.save();
       ctx.font = '32px Arial';
       ctx.fillStyle = 'red';
       player = {};
       var timeout = 200;
       var blink = false;
       while (timeout === 0) {
           if (blink) ctx.fillText("YOU DEAD", WIDTH / 2, HEIGHT / 2, WIDTH);
           if (timeout % 40 === 0) blink = true;
           timeout--;
       }

       ctx.restore();
   };*/

startNewGame = function () {
    player = Player();
    frameCount = 0;
    score = 0;
    bots = {};
    updates = {};
    bullets = {};
    generateRandomBot();
    generateRandomBot();
    generateRandomBot();
};